import {
  Channel,
  ChatInputCommandInteraction,
  Role,
  User,
  APIRole,
  ApplicationCommandOptionType,
  ChannelType,
  Locale,
  CommandInteractionOption, GuildMember, APIInteractionDataResolvedGuildMember
} from "discord.js";

// region Base

export interface BaseSlashCommandOption<DiscordType extends ApplicationCommandOptionType, OutputType> {
  type: DiscordType;
  valueResolver: (interaction: ChatInputCommandInteraction) => OutputType;
  name: string;
  nameLocalizations?: Record<Locale, string>;
  description: string;
  descriptionLocalizations?: Record<Locale, string>;
  required?: boolean;
}

type OptionBuilderInput<OptionType extends BaseSlashCommandOption<any, unknown>, Name extends string> = Omit<OptionType, "type" | "valueResolver"> & { name: Name };
type OptionBuilderOutput<OptionType extends BaseSlashCommandOption<any, unknown>, InputType> = InputType & { type: OptionType["type"], valueResolver: OptionType["valueResolver"] };

export type OptionBuilder<OptionType extends BaseSlashCommandOption<any, unknown>> =
  <Name extends string, OptionInput extends OptionBuilderInput<OptionType, Name>>(opt: OptionInput)
    => OptionBuilderOutput<OptionType, OptionInput>;

export function makeOptionBuilder<
  OptionType extends BaseSlashCommandOption<any, unknown>
>(
  builderFn: OptionBuilder<OptionType>
): OptionBuilder<OptionType> {
  return builderFn;
}

// endregion
// region Type: STRING

export type StringSlashCommandOptionChoice = {
  name: string;
  nameLocalizations?: Record<Locale, string>;
  value: string;
};

interface StringSlashCommandOption extends BaseSlashCommandOption<ApplicationCommandOptionType.String, string> {
  choices?: StringSlashCommandOptionChoice[];
  minLength?: string;
  maxLength?: string;
}

const stringOptionBuilder = makeOptionBuilder<StringSlashCommandOption>(opt => {
  return {
    ...opt,
    type: ApplicationCommandOptionType.String,
    valueResolver: interaction => interaction.options.getString(opt.name) ?? "",
  };
});

// endregion
// region Type: INTEGER

export type IntegerSlashCommandOptionChoice = {
  name: string;
  nameLocalizations?: Record<Locale, string>;
  value: number;
};

export type IntegerSlashCommandOption = BaseSlashCommandOption<ApplicationCommandOptionType.Integer, number> & {
  choices?: IntegerSlashCommandOptionChoice[];
  minValue?: number;
  maxValue?: number;
};

const integerOptionBuilder = makeOptionBuilder<IntegerSlashCommandOption>(opt => {
  return {
    ...opt,
    type: ApplicationCommandOptionType.Integer,
    valueResolver: interaction => interaction.options.getInteger(opt.name, true),
  };
});

// endregion
// region Type: BOOLEAN

export type BooleanSlashCommandOption = BaseSlashCommandOption<ApplicationCommandOptionType.Boolean, boolean> & {
  type: ApplicationCommandOptionType.Boolean;
  resolve: (interaction: ChatInputCommandInteraction, name: string) => boolean;
};

const booleanOptionBuilder = makeOptionBuilder<BooleanSlashCommandOption>(opt => {
  return {
    ...opt,
    type: ApplicationCommandOptionType.Boolean,
    valueResolver: interaction => interaction.options.getBoolean(opt.name, true),
  };
});

// endregion
// region Type: USER

export type UserSlashCommandOption = BaseSlashCommandOption<ApplicationCommandOptionType.User, User>;

const userOptionBuilder = makeOptionBuilder<UserSlashCommandOption>(opt => {
  return {
    ...opt,
    type: ApplicationCommandOptionType.User,
    valueResolver: interaction => interaction.options.getUser(opt.name, true),
  };
});

// endregion
// region Type: CHANNEL

export type ChannelSlashCommandOption<TChannelType extends ChannelType[]> =
  BaseSlashCommandOption<ApplicationCommandOptionType.Channel, Extract<Channel, { type: TChannelType[number] }>>
  & {
    channelTypes: TChannelType;
  };

function channelOptionBuilder<
  TChannelType extends ChannelType[],
  Name extends string,
  OptionInput extends OptionBuilderInput<ChannelSlashCommandOption<TChannelType>, Name>
>(
  opt: OptionInput
): OptionBuilderOutput<ChannelSlashCommandOption<OptionInput["channelTypes"]>, OptionInput> {
  return {
    ...opt,
    type: ApplicationCommandOptionType.Channel,
    valueResolver: interaction =>
      interaction.options.getChannel(opt.name, true) as Extract<Channel, { type: OptionInput["channelTypes"][number] }>,
  };
}

// endregion
// region Type: ROLE

export type RoleSlashCommandOption = BaseSlashCommandOption<ApplicationCommandOptionType.Role, Role | APIRole>;

const roleOptionBuilder = makeOptionBuilder<RoleSlashCommandOption>(opt => {
  return {
    ...opt,
    type: ApplicationCommandOptionType.Role,
    valueResolver: interaction => interaction.options.getRole(opt.name, true),
  };
});

// endregion
// region Type: MENTIONABLE
export type MentionableSlashCommandOption = BaseSlashCommandOption<ApplicationCommandOptionType.Mentionable, User | GuildMember | Role | APIRole | APIInteractionDataResolvedGuildMember>;

const mentionableOptionBuilder = makeOptionBuilder<MentionableSlashCommandOption>(opt => {
  return {
    ...opt,
    type: ApplicationCommandOptionType.Mentionable,
    valueResolver: interaction => interaction.options.getMentionable(opt.name, true),
  };
});

// endregion
// region Type: NUMBER

export type NumberSlashCommandOptionChoice = {
  name: string;
  nameLocalizations?: Record<Locale, string>;
  value: number;
};

export type NumberSlashCommandOption = BaseSlashCommandOption<ApplicationCommandOptionType.Number, number> & {
  choices?: NumberSlashCommandOptionChoice[];
  minValue?: number;
  maxValue?: number;
};

const numberOptionBuilder = makeOptionBuilder<NumberSlashCommandOption>(opt => {
  return {
    ...opt,
    type: ApplicationCommandOptionType.Number,
    valueResolver: interaction => interaction.options.getNumber(opt.name, true),
  };
});

// endregion

export const slashOptions = {
  string: stringOptionBuilder,
  integer: integerOptionBuilder,
  boolean: booleanOptionBuilder,
  user: userOptionBuilder,
  channel: channelOptionBuilder,
  role: roleOptionBuilder,
  mentionable: mentionableOptionBuilder,
  number: numberOptionBuilder,
} satisfies Record<string, (...args: any[]) => BaseSlashCommandOption<any, any>>;
