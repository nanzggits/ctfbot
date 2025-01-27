import { parse } from 'date-fns';

import CommandInteraction from '../../../compat/CommandInteraction';
import { ApplicationCommandDefinition, ApplicationCommandOptionType, CommandOptionMap } from '../../../compat/types';
import { CTF, Challenge } from '../../../../../database/models';
import { TextChannel } from 'discord.js';

export default {
  name: 'start',
  description: 'Set the start date for the CTF. If no date is indicated, sets it to now',
  type: ApplicationCommandOptionType.SUB_COMMAND,
  options: [
    {
      name: 'start_date',
      description: "The desired start date in a 'YYYY MM DD HH:mm' format",
      type: ApplicationCommandOptionType.STRING,
      required: false,
    },
  ],
  async execute(interaction: CommandInteraction, options: CommandOptionMap) {
    const ctf = await CTF.fromGuildSnowflakeCTF(interaction.guild.id);
    ctf.throwErrorUnlessAdmin(interaction);

    const date = options.start_date ? parse(options.start_date.toString(), 'yyyy MM dd HH:mm', new Date()) : new Date();
    if (date.toString() === 'Invalid Date') throw new Error('Date provided is not valid');
    await ctf.setStartDate(date);
    if (!options.start_date) {
      // loop through every Challenge_Channel and add permission Participant: can view
      const teamServers = await ctf.getAllTeamServers();
      const challengesWithPrereqs = new Set(await Challenge.getChallengeIDsWithDependencies());
      for (const teamServer of teamServers) {
        const challengeChannels = await teamServer.getAllChallengeChannels();
        for (const channel of challengeChannels) {
          // only publish challenges that don't have prereqs
          if (!challengesWithPrereqs.has(channel.challenge_id)) {
            await (interaction.client.channels.resolve(channel.channel_snowflake) as TextChannel).updateOverwrite(
              teamServer.getGuild(interaction.client).roles.resolve(teamServer.row.participant_role_snowflake),
              {
                VIEW_CHANNEL: true,
              },
            );
          }
        }
      }
    }
    return `CTF start date has been changed to **${date.toString()}**`;
  },
} as ApplicationCommandDefinition;
