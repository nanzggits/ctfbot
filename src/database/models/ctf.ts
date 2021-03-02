import { Client, Guild, GuildMember, User as DiscordUser } from 'discord.js';
import { Category, Team, TeamServer, User } from '.';
import { CategoryRow, CTFRow, TeamServerRow, UserRow } from '../schemas';
import query from '../database';
import logger from '../../log';
import CommandInteraction from '../../events/interaction/compat/CommandInteraction';

export default class CTF {
  row: CTFRow;

  constructor(row: CTFRow) {
    this.row = row;
  }

  /* CTF Creation / Deletion */
  static async createCTF(name: string, guildSnowflake: string) {
    // check if a CTF already exists in this guild
    const { rows: existingRows } = await query('SELECT id FROM ctfs WHERE guild_snowflake = $1', [guildSnowflake]);
    if (existingRows && existingRows.length > 0) throw new Error('cannot create a second CTF in this guild');

    const { rows } = await query('INSERT INTO ctfs(name, guild_snowflake) VALUES ($1, $2) RETURNING *', [
      name,
      guildSnowflake,
    ]);
    logger(`Created new ctf "${name}"`);
    return new CTF(rows[0] as CTFRow);
  }

  async deleteCTF() {
    // because of Foreign Key constraints, deletes all associated Team Servers, Teams, Categories, and Challenges
    await query(`DELETE FROM ctfs WHERE id = ${this.row.id}`);
    logger(`Deleted ctf "${this.row.name}"`);
  }

  /* CTF Retrieval */
  static async fromNameCTF(name: string) {
    const { rows } = await query('SELECT * FROM ctfs WHERE name = $1', [name]);
    if (rows.length === 0) throw new Error('no ctf associated with that name');
    return new CTF(rows[0] as CTFRow);
  }

  static async fromCTFGuildSnowflakeCTF(guild_snowflake: string) {
    const { rows } = await query('SELECT * FROM ctfs WHERE guild_snowflake = $1', [guild_snowflake]);
    if (rows.length === 0) throw new Error('no ctf associated with this guild');
    return new CTF(rows[0] as CTFRow);
  }

  static async fromIdCTF(ctf_id: number) {
    const { rows } = await query(`SELECT * FROM ctfs WHERE id = ${ctf_id}`);
    if (rows.length === 0) throw new Error('invalid ctf id');
    return new CTF(rows[0] as CTFRow);
  }

  /* CTF Setters */
  // Unique among CTFs
  async setName(name: string) {
    await query(`UPDATE ctfs SET name = $1 WHERE id = ${this.row.id}`, [name]);
    this.row.name = name;
  }

  async setDescription(description: string) {
    await query(`UPDATE ctfs SET description = $1 WHERE id = ${this.row.id}`, [description]);
    this.row.description = description;
    if (description !== '') logger(`Set ${this.row.name}'s description to "${description}"`);
  }

  async setStartDate(startDate: Date) {
    await query(`UPDATE ctfs SET start_date = $1 WHERE id = ${this.row.id}`, [startDate]);
    this.row.start_date = startDate;
  }

  async setEndDate(endDate: Date) {
    await query(`UPDATE ctfs SET end_date = $1 WHERE id = ${this.row.id}`, [endDate]);
    this.row.end_date = endDate;
  }

  // Valid role in the CTF guild
  async setAdminRoleSnowflake(adminRoleSnowflake: string) {
    await query(`UPDATE ctfs SET admin_role_snowflake = $1 WHERE id = ${this.row.id}`, [adminRoleSnowflake]);
    this.row.admin_role_snowflake = adminRoleSnowflake;
  }

  // Valid channel in the CTF guild
  async setAnnouncementsChannelSnowflake(announcementsChannelSnowflake: string) {
    await query(`UPDATE ctfs SET announcements_channel_snowflake = $1 WHERE id = ${this.row.id}`, [
      announcementsChannelSnowflake,
    ]);
    this.row.announcements_channel_snowflake = announcementsChannelSnowflake;
  }

  /* Category Creation */
  async createCategory(name: string) {
    // check if a category already exists with that name in this ctf
    const { rows: existingRows } = await query(
      `SELECT id FROM categories WHERE name = $1 and ctf_id = ${this.row.id}`,
      [name],
    );
    if (existingRows && existingRows.length > 0)
      throw new Error('cannot create a category with a duplicate name in this ctf');

    const { rows } = await query(`INSERT INTO categories(ctf_id, name) VALUES (${this.row.id}, $1) RETURNING *`, [
      name,
    ]);
    return new Category(rows[0] as CategoryRow);
  }

  /* Category Retrieval */
  async fromNameCategory(name: string) {
    const { rows } = await query(`SELECT * FROM categories WHERE name = $1 and ctf_id = ${this.row.id}`, [name]);
    if (rows.length === 0) throw new Error('no category with that name in this ctf');
    return new Category(rows[0] as CategoryRow);
  }

  async fromChannelCategorySnowflakeCategory(channel_category_snowflake: string) {
    const {
      rows,
    } = await query(`SELECT * FROM categories WHERE channel_category_snowflake = $1 and ctf_id = ${this.row.id}`, [
      channel_category_snowflake,
    ]);
    if (rows.length === 0) throw new Error('no category with that snowflake in this ctf');
    return new Category(rows[0] as CategoryRow);
  }

  async getAllCategories() {
    const { rows } = await query(`SELECT * FROM categories WHERE ctf_id = ${this.row.id}`);
    return rows.map((row) => new Category(row as CategoryRow));
  }

  /* Team Server Creation */
  async createTeamServer(guild: Guild, name: string, team_limit: number) {
    const {
      rows: existingRows,
    } = await query(`SELECT id FROM team_servers WHERE ctf_id = ${this.row.id} and name = $1`, [name]);
    if (existingRows && existingRows.length > 0)
      throw new Error('cannot create a team server with a duplicate name in this ctf');

    const { rows: existingRows2 } = await query('SELECT id FROM team_servers WHERE guild_snowflake = $1', [guild.id]);
    if (existingRows2 && existingRows2.length > 0) throw new Error('guilds are limited to a single teamserver');

    // Do a check to see if anything is using the team_category_snowflake or info_channel_snowflake?

    const {
      rows,
    } = await query(
      `INSERT INTO team_servers(guild_snowflake, ctf_id, name, team_limit) VALUES ($1, ${this.row.id}, $2, $3) RETURNING *`,
      [guild.id, name, team_limit],
    );
    logger(`Created new team server "${name}" for ctf "${this.row.name}"`);
    const teamServer = new TeamServer(rows[0] as TeamServerRow);
    await teamServer.setInfoChannelSnowflake((await teamServer.makeChannel(guild.client, 'info')).id);
    await teamServer.setTeamCategorySnowflake((await teamServer.makeCategory(guild.client, 'Teams')).id);
  }

  /* Team Server Retrieval */
  async fromNameTeamServer(name: string) {
    const { rows } = await query(`SELECT * FROM team_servers WHERE name = $1 and ctf_id = ${this.row.id}`, [name]);
    if (rows.length === 0) throw new Error('no team server with that name in this ctf');
    return new TeamServer(rows[0] as TeamServerRow);
  }

  // Get either TeamServer or main ctf guild id and return the ctf

  static async fromTeamServerGuildSnowflakeTeamServer(guild_snowflake: string) {
    const { rows } = await query('SELECT * FROM team_servers WHERE guild_snowflake = $1', [guild_snowflake]);
    if (rows.length === 0) throw new Error('no team server with that snowflake');
    return new TeamServer(rows[0] as TeamServerRow);
  }

  static async fromIdTeamServer(team_server_id: number) {
    const { rows } = await query(`SELECT * FROM team_servers WHERE id = ${team_server_id}`);
    if (rows.length === 0) throw new Error('invalid team server id');
    return new TeamServer(rows[0] as TeamServerRow);
  }

  async getAllTeamServers() {
    const { rows } = await query(`SELECT * FROM team_servers WHERE ctf_id = ${this.row.id}`);
    return rows.map((row) => new TeamServer(row as TeamServerRow));
  }

  async printAllTeamServers() {
    const teamServers = await this.getAllTeamServers();
    const printString =
      teamServers.length === 0
        ? `CTF "${this.row.name}" has no team servers`
        : `CTF "${this.row.name}"'s Team Servers are : ${teamServers
            .map((server) => `${server.row.name}, `)
            .toString()
            .slice(0, -2)}`;
    // extra , in between????
    logger(printString);
    return printString;
  }

  /** User Creation */
  async createUser(user_snowflake: string) {
    // Check

    const {
      rows,
    } = await query(
      `INSERT INTO users(ctf_id, user_snowflake, tos_accepted) VALUES (${this.row.id}, $2, false) RETURNING *`,
      [user_snowflake],
    );
    return new User(rows[0] as UserRow);
  }

  /** User Retrieval */
  async fromUserSnowflakeUser(user_snowflake: string) {
    const { rows } = await query(`SELECT * FROM users WHERE user_snowflake = $1 and ctf_id = ${this.row.id}`, [
      user_snowflake,
    ]);
    if (rows.length === 0) throw new Error('that user is not in this ctf');
    return new User(rows[0] as UserRow);
  }

  /** Misc Methods */
  static async fromGuildSnowflakeCTF(guild_id: string) {
    let ctf: CTF;
    try {
      // Try it as a TeamServer guild snowflake
      ctf = await CTF.fromIdCTF((await CTF.fromTeamServerGuildSnowflakeTeamServer(guild_id)).row.ctf_id);
    } catch {
      // Try it as a CTF guild snowflake
      ctf = await CTF.fromCTFGuildSnowflakeCTF(guild_id);
    }
    return ctf;
  }

  throwErrorUnlessAdmin(interaction: CommandInteraction) {
    // if the admin role isn't set, no check is performed
    // otherwise, we need to check if the caller has admin
    if (!this.row.admin_role_snowflake) return;

    // if this was sent in the main guild, use the guild member
    // otherwise, we need to resolve the guild member in the main guild
    const member =
      this.row.guild_snowflake === interaction.guild.id
        ? interaction.member
        : interaction.guild.member(interaction.member.user);

    if (member.roles.cache.has(this.row.admin_role_snowflake)) return;
    throw new Error('You do not have permission to use this command');
  }

  async makeRole(client: Client, name: string) {
    const ctfServerGuild = client.guilds.cache.find((guild) => guild.id === this.row.guild_snowflake);
    const role = await ctfServerGuild.roles.create({ data: { name: `${name}` } });
    logger(`Made new role "${name}" in CTF guild "${this.row.name}"`);
    return role;
  }

  async deleteRole(client: Client, role_snowflake: string) {
    const guild = client.guilds.cache.find((server) => server.id === this.row.guild_snowflake);
    const roleToDelete = guild.roles.cache.find((role) => role.id === role_snowflake);
    if (roleToDelete) {
      await roleToDelete.delete();
      logger(`Role with ${role_snowflake} found: deleted that role`);
      return;
    }
    logger(`Role with ${role_snowflake} not found`);
  }

  async getTeamServerWithSpace() {
    logger('Seeing what servers have space...');
    // eslint-disable-next-line
    const teamServer = (await this.getAllTeamServers()).find(async (server) => (await server.hasSpace()) === true);
    if (!teamServer) {
      throw new Error('all team servers are full');
    }
    return teamServer;
  }

  async fromRoleTeam(team_role_snowflake: string) {
    const teamServers = await this.getAllTeamServers();
    let team: Team;
    // eslint-disable-next-line
    for (let server of teamServers) {
      try {
        // eslint-disable-next-line
        team = await server.fromRoleTeam(team_role_snowflake);
        return team;
      } catch {
        // eslint-disable-next-line
        continue;
      }
    }
    throw new Error("that role doesn't belong to a team");
  }

  async fromUserTeam(user_snowflake: string) {
    const teamServers = await this.getAllTeamServers();
    let team: Team;
    const teamID = (await this.fromUserSnowflakeUser(user_snowflake)).row.team_id;
    // eslint-disable-next-line
    for (const server of teamServers) {
      // eslint-disable-next-line
      try {
        // eslint-disable-next-line
        team = await server.fromIdTeam(teamID);
        return team;
      } catch {
        // eslint-disable-next-line
        continue;
      }
    }
    throw new Error('no team associated with that user');
  }

  async fromChannelTeam(channel_snowflake: string) {
    const teamServers = await this.getAllTeamServers();
    let team: Team;
    // eslint-disable-next-line
    for (const server of teamServers) {
      try {
        // eslint-disable-next-line
        team = await server.fromChannelTeam(channel_snowflake);
        return team;
      } catch {
        // eslint-disable-next-line
        continue;
      }
    }
    throw new Error('no team asociated with that channel');
  }

  async fromUnspecifiedTeam(user_snowflake: string, channel_snowflake: string) {
    try {
      return await this.fromChannelTeam(channel_snowflake);
    } catch {
      try {
        return await this.fromUserTeam(user_snowflake);
      } catch {
        throw new Error('no team can be found with the given info');
      }
    }
  }
}
