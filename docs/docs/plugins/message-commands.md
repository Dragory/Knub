---
sidebar_position: 7
---

## Message commands

Knub supports traditional message-based commands in addition to slash commands. Message commands are defined using plain JavaScript/TypeScript objects and follow a similar structure to slash commands, with built-in type safety and permission support.

### Creating a message command

Use the `guildPluginMessageCommand()` helper to create a message command for a guild plugin:

```ts
import { guildPluginMessageCommand } from "knub";
import { baseCommandParameterTypeHelpers as p } from "knub";

export const ExampleCmd = guildPluginMessageCommand({
  trigger: "example",
  description: "Sends a sample response",
  permission: "can_example",

  signature: {
    user: p.user({ required: false }),
    text: p.string({ required: false }),
  },

  async run({ message, args, pluginData }) {
    message.channel.send(`Hello ${args.user?.username ?? "there"}! You said: ${args.text ?? "(nothing)"}`);
  },
});
```

### Including it in a plugin

Message commands are added to a plugin using the `messageCommands` property:

```ts
guildPlugin({
  // ...
  messageCommands: [
    ExampleCmd,
  ],
  // ...
})
```

### Available properties

```ts
guildPluginMessageCommand({
  trigger: "example", // or ["alias1", "alias2"]
  description: "Short description shown in help",
  permission: "can_example", // Matches a config property
  signature: {}, // Parameter definition
  run({ message, args, pluginData }) {
    // Command logic here
  },
})
```

- **trigger**: The word(s) that invoke the command (can be a string or an array of strings).
- **description**: Shown in help commands or documentation.
- **permission**: A string key matched against plugin config (used with configSchema/defaultOverrides).
- **signature**: Defines expected arguments using type helpers.
- **run**: The function that is called when the command is used.

### Parameters

Parameter types are defined using `baseCommandParameterTypeHelpers`. Each helper accepts a config object such as `{ required: false }`.

Available parameter types include:

- `user`
- `member`
- `userId`
- `channel`
- `channelId`
- `textChannel`
- `voiceChannel`
- `role`
- `string`
- `number`
- `bool`
- `switchOption`

Example:

```ts
signature: {
  user: p.user({ required: false }),
  reason: p.string({ required: false }),
}
```

You can also use fallback types with `||`:

```ts
signature: {
  user: p.member({ required: false }) || p.user({ required: false }),
}
```

### Permissions and overrides

Permissions specified on message commands (e.g., `"can_example"`) must be declared in the plugin’s `configSchema` and defined in `defaultOverrides`.

Example plugin overrides:

```ts
defaultOverrides: [
  {
    level: ">=50",
    config: {
      can_example: true,
    },
  },
]
```

If the config permission is not true (after overrides are applied), the command will not be executable.

### Notes

- Message commands are useful for bots that still rely on text-based prefixes or when you need more flexibility than Discord's slash command system allows.
- You can combine message and slash commands in the same plugin.
- Signature parsing is strict and supports fallback types (`||`) for flexible input handling.
