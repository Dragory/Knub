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
  resolveValue: (interaction: ChatInputCommandInteraction) => OutputType;
  getExtraAPIProps: () => Record<string, any>;
  name: string;
  nameLocalizations?: Record<Locale, string>;
  description: string;
  descriptionLocalizations?: Record<Locale, string>;
  required?: boolean;
}

type OptionBuilderInput<OptionType extends BaseSlashCommandOption<any, unknown>, Name extends string> = Omit<OptionType, "type" | "resolveValue" | "getExtraAPIProps"> & { name: Name };
type OptionBuilderOutput<OptionType extends BaseSlashCommandOption<any, unknown>, InputType> = InputType & { type: OptionType["type"], resolveValue: OptionType["resolveValue"], getExtraAPIProps: OptionType["getExtraAPIProps"] };

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
    resolveValue: interaction => interaction.options.getString(opt.name) ?? "",
    getExtraAPIProps: () => ({
      choices: opt.choices
        ? opt.choices.map(choice => ({
            name: choice.name,
            name_localizations: choice.nameLocalizations,
            value: choice.value,
          }))
        : undefined,
      min_length: opt.minLength,
      max_length: opt.maxLength,
    }),
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
    resolveValue: interaction => interaction.options.getInteger(opt.name, true),
    getExtraAPIProps: () => ({
      choices: opt.choices
        ? opt.choices.map(choice => ({
          name: choice.name,
          name_localizations: choice.nameLocalizations,
          value: choice.value,
        }))
        : undefined,
      min_value: opt.minValue,
      max_value: opt.maxValue,
    }),
  };
});

// endregion
// region Type: BOOLEAN

export type BooleanSlashCommandOption = BaseSlashCommandOption<ApplicationCommandOptionType.Boolean, boolean>;

const booleanOptionBuilder = makeOptionBuilder<BooleanSlashCommandOption>(opt => {
  return {
    ...opt,
    type: ApplicationCommandOptionType.Boolean,
    resolveValue: interaction => interaction.options.getBoolean(opt.name, true),
    getExtraAPIProps: () => ({}),
  };
});

// endregion
// region Type: USER

export type UserSlashCommandOption = BaseSlashCommandOption<ApplicationCommandOptionType.User, User>;

const userOptionBuilder = makeOptionBuilder<UserSlashCommandOption>(opt => {
  return {
    ...opt,
    type: ApplicationCommandOptionType.User,
    resolveValue: interaction => interaction.options.getUser(opt.name, true),
    getExtraAPIProps: () => ({}),
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
    resolveValue: interaction =>
      interaction.options.getChannel(opt.name, true) as Extract<Channel, { type: OptionInput["channelTypes"][number] }>,
    getExtraAPIProps: () => ({
      channel_types: opt.channelTypes,
    }),
  };
}

// endregion
// region Type: ROLE

export type RoleSlashCommandOption = BaseSlashCommandOption<ApplicationCommandOptionType.Role, Role | APIRole>;

const roleOptionBuilder = makeOptionBuilder<RoleSlashCommandOption>(opt => {
  return {
    ...opt,
    type: ApplicationCommandOptionType.Role,
    resolveValue: interaction => interaction.options.getRole(opt.name, true),
    getExtraAPIProps: () => ({}),
  };
});

// endregion
// region Type: MENTIONABLE
export type MentionableSlashCommandOption = BaseSlashCommandOption<ApplicationCommandOptionType.Mentionable, User | GuildMember | Role | APIRole | APIInteractionDataResolvedGuildMember>;

const mentionableOptionBuilder = makeOptionBuilder<MentionableSlashCommandOption>(opt => {
  return {
    ...opt,
    type: ApplicationCommandOptionType.Mentionable,
    resolveValue: interaction => interaction.options.getMentionable(opt.name, true),
    getExtraAPIProps: () => ({}),
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
    resolveValue: interaction => interaction.options.getNumber(opt.name, true),
    getExtraAPIProps: () => ({
      choices: opt.choices
        ? opt.choices.map(choice => ({
            name: choice.name,
            name_localizations: choice.nameLocalizations,
            value: choice.value,
          }))
        : undefined,
      min_value: opt.minValue,
      max_value: opt.maxValue,
    }),
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
