import { Client } from 'discord.js';
import { discordConfig } from './config';
import eventLoader from './events';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import database from './database';

const client = new Client();
eventLoader(client);

client
  .login(discordConfig.token)
  .then(() => {})
  .catch(() => {});
