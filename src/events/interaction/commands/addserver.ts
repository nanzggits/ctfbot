import CommandInteraction from '../compat/CommandInteraction';
import { ApplicationCommandDefinition, ApplicationCommandOptionType, CommandOptionMap } from '../compat/types';
import { CTF } from '../../../database/models';

export default {
  name: 'addserver',
  description: 'Adds the current guild as a team server for the indicated CTF',
  options: [
    {
      name: 'limit',
      description: 'The max number of teams allowed to be in the server',
      type: ApplicationCommandOptionType.INTEGER,
      required: true,
    },
    {
      name: 'ctf_name',
      description: 'The name of the CTF to add the guild to',
      type: ApplicationCommandOptionType.STRING,
      required: false,
    },
    {
      name: 'name',
      description: 'The unique identifier the server will be referred to as',
      type: ApplicationCommandOptionType.STRING,
      required: false,
    },
  ],
  async execute(interaction: CommandInteraction, options: CommandOptionMap) {
    const ctf = await (options.ctf_name
      ? CTF.fromNameCTF(options.ctf_name as string)
      : CTF.fromGuildSnowflakeCTF(interaction.guild.id));

    const name = options.name ? (options.name as string) : interaction.guild.name;
    const server = await ctf.createTeamServer(interaction.guild, name, options.limit as number, interaction.member);
    return `Added Team Server **${server.row.name}** to CTF **${ctf.row.name}** with limit **${server.row.team_limit}**`;
  },
} as ApplicationCommandDefinition;
