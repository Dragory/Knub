---
sidebar_position: 4
---

# Slash commands

Like plugins, slash commands in Knub are plain JavaScript objects.

There are two helper functions, `guildPluginSlashCommand()` and `globalPluginSlashCommand()`,
that can be used to create slash commands for guild plugins and global plugins respectively.

## A basic slash command example

```ts
import { guildPluginSlashCommand, slashOptions } from "knub";

// Use the helper function for auto-completions and type checks
const echoCommand = guildPluginSlashCommand({
  // Name of the command. This is what users will see when they type "/".
  name: "echo",
  // Description of the command. Shown after the name in the Discord command list.
  description: "Repeats what you say",
  // The available options for the command.
  // In this case, we just have one called "text".
  signature: [
    slashOptions.string({ name: "text", description: "", required: true }),
  ],
  // The function that actually runs the command.
  // In this example, we just reply to the interaction with what the user typed in the "text" option.
  run({ interaction, options }) {
    // Type inference: the type of "options.text" is "string"
    interaction.reply(options.text);
  },
});
```

### How to include it in a plugin:
```ts
guildPlugin({
  // ...
  slashCommands: [
    echoCommand,
  ],
  // ...
})
```

## Available properties
```ts
guildPluginSlashCommand({
  // Required: Name of the command. This is what users will see when they type "/".
  name: "echo",
  // Required: Description of the command. Shown after the name in the Discord command list.
  description: "Repeats what you say",
  // Required: Available options for the command
  signature: [],
  // Required: The function that actually runs the command.
  run(meta) {
    // ...
  },
  // Default member permissions required to use this command.
  // This is a bit set represented as a string. See further below for an example of how to create this.
  defaultMemberPermissions: "0",
  // A custom permission check based on plugin config.
  // If this is set to a config property (or a dot.path.to.one for nested properties), that property
  // must be "true" to be able to run the command. This takes overrides into account.
  configPermission: "can_use",
  // A set of localizations/translations for the command name.
  // The object key is the locale and the value is the localization.
  nameLocalizations: {
    "fi-FI": "kaiku",
  },
  // A set of localizations/translations for the command description.
  // The object key is the locale and the value is the localization.
  descriptionLocalizations: {
    "fi-FI": "Kuin tunnelissa olisit",
  },
})

globalPluginSlashCommand({
  // All guild plugin properties, plus
  
  // Whether to allow users to run this command in DMs
  allowDms: false,
})
```

### Default member permissions

Default member permissions for commands are specified as a [bit set of required permissions](https://discord.com/developers/docs/topics/permissions).

You can use `PermissionFlagsBits` from discord.js for this:
```ts
import { PermissionFlagsBits } from "discord.js";

guildPluginSlashCommand({
  // ...
  defaultMemberPermissions: PermissionFlagsBits.ManageRoles.toString(),
  // ...
})
```

To require multiple permissions, use [bitwise OR](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_OR):

```ts
import { PermissionFlagsBits } from "discord.js";

// Both "Manage Roles" and "Manage Channels" permissions are required
const permissions = (
  PermissionFlagsBits.ManageRoles
  | PermissionFlagsBits.ManageChannels
).toString(); // "268435472"

guildPluginSlashCommand({
  // ...
  defaultMemberPermissions: permissions,
  // ...
})
```

## Options

Slash command options are specified using the `slashOptions` helper functions:

* `slashOptions.string()`
* `slashOptions.integer()`
* `slashOptions.boolean()`
* `slashOptions.user()`
* `slashOptions.channel()`
* `slashOptions.role()`
* `slashOptions.mentionable()`
* `slashOptions.number()`

Each takes an object as an argument with details of the option. `name` and `description` are always required.

### Common properties

All slash options support the following properties:
```ts
slashOptions.anything({
  // Required: Name of the option. Shown to the user.
  name: "text",
  // Required: Description of the option. Shown to the user.
  description: "The text to repeat",
  // Whether the option is required. Defaults to false.
  required: false,
  // A set of localizations/translations for the option name.
  // The object key is the locale and the value is the localization.
  nameLocalizations: {
    "fi-FI": "teksti",
  },
  // A set of localizations/translations for the option description.
  // The object key is the locale and the value is the localization.
  descriptionLocalizations: {
    "fi-FI": "Toistettava teksti",
  },
})
```

### `slashOptions.string()`-specific properties

```ts
slashOptions.string({
  // All common properties above, plus:

  // Minimum length of the entered text
  minLength: 0,
  // Maximum length of the entered text
  maxLength: 100,
  // If set, the option is limited to a set of choices
  // Supports up to 25 choices
  choices: [
    {
      // Name of the choice
      name: "The best choice",
      // The value that the option gets if the choice is picked
      value: "best",
      // A set of localizations/translations for the option.
      // The object key is the locale and the value is the localization.
      nameLocalizations: {
        "fi-FI": "Ananas pitsan päällä",
      },
    },
  ],
})
```

### `slashOptions.integer()`-specific properties

```ts
slashOptions.integer({
  // All common properties above, plus:

  // Minimum integer that can be entered
  minValue: 0,
  // Maximum integer that can be entered
  maxValue: 100,
  // If set, the option is limited to a set of choices
  // Supports up to 25 choices
  choices: [
    {
      // Name of the choice
      name: "Answer to the Ultimate Question of Life, the Universe, and Everything",
      // The value that the option gets if the choice is picked
      value: 42,
      // A set of localizations/translations for the option.
      // The object key is the locale and the value is the localization.
      nameLocalizations: {
        "fi-FI": "Vastaus elämään, maailmankaikkeuteen ja kaikkeen muuhun sellaiseen",
      },
    },
  ],
})
```

### `slashOptions.channel()`-specific properties

```ts
import { ChannelType } from "discord.js";

slashOptions.channel({
  // All common properties above, plus:

  // Required. Allowed channel types.
  channelTypes: [
    ChannelType.GuildText,
    ChannelType.GuildVoice,
  ],
})
```

### `slashOptions.number()`-specific properties

```ts
slashOptions.integer({
  // All common properties above, plus:

  // Minimum number that can be entered
  minValue: 0.25,
  // Maximum number that can be entered
  maxValue: 2.75,
  // If set, the option is limited to a set of choices
  // Supports up to 25 choices
  choices: [
    {
      // Name of the choice
      name: "𝜋",
      // The value that the option gets if the choice is picked
      value: 3.14159265,
      // A set of localizations/translations for the option.
      // The object key is the locale and the value is the localization.
      nameLocalizations: {
        "fi-FI": "Pii",
      },
    },
  ],
})
```
