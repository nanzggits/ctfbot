export interface ApplicationCommandOption extends ApplicationCommandRequest {
  type: ApplicationCommandOptionType,
  required?: boolean,
  choices?: ApplicationCommandOptionChoice[]
}
export interface ApplicationCommandOptionChoice {
  name: string,
  value: string | number,
}
export interface ApplicationCommandRequest {
  name: string,
  description: string,
  options?: ApplicationCommandOption[]
}

export interface ApplicationCommandResponseOption extends ApplicationCommandResponse {
  type: ApplicationCommandOptionType,
  value?: string | number
}
export interface ApplicationCommandResponse {
  name: string,
  options?: ApplicationCommandResponseOption[]
}

export interface ApplicationCommandDefinition extends ApplicationCommandRequest {
  type?: ApplicationCommandOptionType
  execute?: (CommandInteraction, ApplicationCommandResponseOption) => Promise<string> | string | void
}

export interface RegisteredCommand extends ApplicationCommandRequest {
  id: string,
  application_id: string
}

export interface InteractionData {
  id: string,
  type: number,
  token: string,
  channel_id?: string,
  user?: string,
  guild_id?: string,
  member?: string
}

export interface CommandInteractionData extends InteractionData {
  data: {
    id: string,
    name: string,
    options: ApplicationCommandOption[]
  }
}

export enum ApplicationCommandOptionType {
  SUB_COMMAND = 1,
  SUB_COMMAND_GROUP,
  STRING,
  INTEGER,
  BOOLEAN,
  USER,
  CHANNEL,
  ROLE,
}

export enum InteractionType {
  PING = 1,
  APPLICATION_COMMAND,
}

export enum InteractionResponseType {
  PONG = 1,
  ACKNOWLEDGE,
  CHANNEL_MESSAGE,
  CHANNEL_MESSAGE_WITH_SOURCE,
  ACKNOWLEDGE_WITH_SOURCE,
}