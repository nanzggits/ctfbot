import { GuildMember } from 'discord.js';
import { NoTeamUserError, NoUserError } from '../../errors';
import { CTF, TeamServer } from '../../database/models';
import { logger } from '../../log';

const guildMemberAddEvent = async (member: GuildMember) => {
  //   user joins Team Server
  // * if the user does have a corresponding entry in the user database, AND THEY ARE ASSIGNED TO THIS TEAM SERVER, grant their roles
  // * if the user is an admin in the main guild, don't kick
  // * otherwise, send a nice message explanation, then kick
  logger(`${member.user.username} joined ${member.guild.name}`);
  let ctf: CTF;
  try {
    ctf = await CTF.fromGuildSnowflakeCTF(member.guild.id);
  } catch {
    return;
  }
  let teamServer: TeamServer;
  try {
    teamServer = await ctf.fromGuildSnowflakeTeamServer(member.guild.id);
  } catch {
    teamServer = null;
  }
  // Check to see if it's a main server: either not a team server or a team server with same id as main
  if (!teamServer || ctf.row.guild_snowflake === teamServer.row.guild_snowflake) {
    try {
      // Try to resolve the user
      await ctf.fromUserSnowflakeUser(member.user.id);
      // Give them the participant role back
      // Give them their team role back
      const team = await ctf.fromUserTeam(member.user.id);
      await member.roles.add([
        //team.row.team_role_snowflake_main,
        ctf.row.participant_role_snowflake,
        (await CTF.fromIdTeamServer(team.row.team_server_id)).row.invite_role_snowflake,
      ]);
    } catch (err) {
      if (err instanceof NoUserError) {
        // First time user joining the main ctf server
      } else if (err instanceof NoTeamUserError) {
        // TODO: User isn't a part of a team but is a part of the ctf
      } else {
        throw err;
      }
    }
    return;
  }

  if (teamServer) {
    // if user is an admin in the main guild, give them admin in the team server
    if (
      member.client.guilds
        .resolve(ctf.row.guild_snowflake)
        .members.resolve(member.id)
        ?.roles.cache.find((role) => role.id === ctf.row.admin_role_snowflake)
    ) {
      await member.roles.add(teamServer.row.admin_role_snowflake);
      return;
    }

    // otherwise, users should get participant
    try {
      await ctf.fromUserSnowflakeUser(member.user.id);

      const team = await ctf.fromUserTeam(member.user.id);
      if ((await CTF.fromIdTeamServer(team.row.team_server_id)).row.guild_snowflake !== member.guild.id) {
        throw new Error();
      }
      // Give them their team server role back
      await member.roles.add([team.row.team_role_snowflake_team_server, teamServer.row.participant_role_snowflake]);
    } catch {
      // kick after 10 seconds
      setTimeout(() => {
        void member.kick('Not a valid user for this team server').then((m) => {
          void m
            .send(
              "Don\t know how you got here but you aren't supposed to be here. If you believe you are then please let a CTF Admin know",
            )
            .catch(() => {});
        });
      }, 1000 * 10);
    }
  }
};

export default guildMemberAddEvent;
