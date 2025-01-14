export const schema = `CREATE TABLE IF NOT EXISTS team_servers (
    id serial,
    guild_snowflake text,
    ctf_id integer REFERENCES ctfs ON DELETE CASCADE,
    info_channel_snowflake text,
    team_category_snowflake text,
    admin_role_snowflake text,
    participant_role_snowflake text,
    invite_role_snowflake text,
    server_invite text,
    invite_channel_snowflake text,
    name text,
    team_limit integer,
    PRIMARY KEY( id )
  );`;

export interface TeamServerRow {
  id: number;
  guild_snowflake: string;
  ctf_id: number;
  info_channel_snowflake: string | null;
  team_category_snowflake: string | null;
  invite_channel_snowflake: string | null;
  admin_role_snowflake: string | null;
  participant_role_snowflake: string | null;
  invite_role_snowflake: string | null;
  server_invite: string | null;
  name: string;
  team_limit: number;
}
