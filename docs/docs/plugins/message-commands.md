---
sidebar_position: 5
---

# Message commands

While slash commands are the modern Discord standard, Knub still supports classic prefix-based message commands. This
page explains how to declare message command blueprints, customise their behaviour, and take advantage of the helpers in
`PluginMessageCommandManager`.

## Declaring message commands

Message command blueprints are created with `guildPluginMessageCommand()` or `globalPluginMessageCommand()` and attached
to a plugin blueprint via the `messageCommands` array.

```ts
import { guildPlugin, guildPluginMessageCommand } from "knub";
import z from "zod";

const pingCommand = guildPluginMessageCommand({
  trigger: "ping",
  permission: null,
  run: async ({ message }) => {
    await message.reply("Pong!");
  },
});

export const pingPlugin = guildPlugin({
  name: "ping",
  configSchema: z.strictObject({}),
  messageCommands: [pingCommand],
});
```

The minimal blueprint specifies a trigger (string or array of triggers), a permission name, and a `run` handler. The
handler receives a `MessageCommandMeta` object with parsed arguments, the triggering message, the command definition, and
`pluginData`.

### Signatures and argument parsing

Message commands accept optional argument signatures from [`knub-command-manager`](https://www.npmjs.com/package/knub-command-manager).
You can describe positional parameters, options, or rest arguments, and Knub will parse them before invoking your
handler.

```ts
const sayCommand = guildPluginMessageCommand({
  trigger: "say",
  permission: "can.say",
  signature: {
    channel: channel(),
    text: rest({ required: true }),
  },
  run: async ({ args, pluginData }) => {
    const config = pluginData.config.get();
    await args.channel.send({ content: args.text, allowedMentions: { parse: [] } });
  },
});
```

See the [`messageCommandUtils`](https://github.com/knub/knub/blob/main/src/commands/messageCommands/messageCommandUtils.ts)
module for ready-made converters and helpers.

### Permissions and filters

Knub automatically runs a pre-filter pipeline before executing the command:

1. `restrictCommandSource` – Respects the blueprint’s `source` option (`"guild"`, `"dm"`, or both).
2. `checkCommandPermission` – Resolves the `permission` string using the plugin configuration.
3. Custom `preFilters` defined on the blueprint.

Similarly, post-filters enforce cooldowns and locks after the command runs. You can append additional filters through the
blueprint`s `config.preFilters`/`config.postFilters` arrays.

## Deleted commands

The optional `deletedMessageCommands` array on a plugin blueprint lets you remove legacy triggers from the command
manager when the plugin loads. This is useful when you rename commands or consolidate aliases without leaving stale
entries behind.

```ts
export const moderationPlugin = guildPlugin({
  name: "moderation",
  configSchema: z.strictObject({}),
  messageCommands: [kickCommand, banCommand],
  deletedMessageCommands: ["warn", "softban"],
});
```

When the plugin loads, any existing message commands with triggers `warn` or `softban` are removed before new commands
are registered. The removal emits a lifecycle event (see below), which enables analytics or migration logging.

## Command lifecycle events

`PluginMessageCommandManager` emits notifications whenever commands are added or removed. Subscribe to these events from
within your plugin:

```ts
pluginData.messageCommands.onCommandAdded(({ command }) => {
  console.log(`[${pluginData.pluginName}] registered`, command.originalTriggers[0]);
});

pluginData.messageCommands.onCommandDeleted(({ command, reason }) => {
  console.log(`[${pluginData.pluginName}] removed`, command.originalTriggers[0], reason);
});
```

Removal reasons are one of:

- `"manual"` – Removed via `remove(id)`.
- `"deleted"` – Removed through `removeByTrigger()` or a matching entry in `deletedMessageCommands`.
- `"replaced"` – A new blueprint replaced an existing command with the same trigger.

These hooks are a convenient place to keep metrics up to date or synchronise external registries.

## Manual command dispatch

Knub automatically attaches a `messageCreate` listener for each plugin that registers message commands. Sometimes you
need more control – for example, when implementing aliases or rewriting the command content before execution.

Use `knub.dispatchMessageCommands(message)` to run the standard dispatch pipeline manually. The helper ensures the
message is processed only once by marking it internally. Subsequent calls (including the default event listener) do
nothing.

```ts
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (message.content.startsWith("!alias")) {
    const rewrittenContent = message.content.replace("!alias", "!realcommand");
    const rewrittenMessage = Object.create(message, {
      content: { value: rewrittenContent },
    });
    await knub.dispatchMessageCommands(rewrittenMessage);
    return;
  }

  await knub.dispatchMessageCommands(message);
});
```

> **Important:** Always call `dispatchMessageCommands` instead of invoking a plugin’s `messageCommands.runFromMessage`
> directly. The dispatcher handles global plugins, dependency-only plugins, and the “already processed” guard for you.

If you need to know whether dispatch already happened, use `hasMessageCommandBeenDispatched(message)` from
`messageCommandUtils`. This is the same check Knub performs internally.

## Advanced manager helpers

`PluginMessageCommandManager` also exposes a few utility methods:

- `getAll()` – Inspect currently registered command definitions.
- `removeByTrigger(trigger)` – Remove the first command matching the trigger string. Returns `true` when a command was
  removed.
- `remove(id, reason?)` – Remove a command by ID. Generally you should call this only from within your plugin.
- `onCommandAdded(listener)` / `onCommandDeleted(listener)` – Subscribe to lifecycle events. They return an unsubscribe
  function.

You rarely construct the manager yourself – Knub injects it into `pluginData` – but these helpers give you the tools to
implement migrations, analytics, and other custom behaviours without digging into internals.

With these tools you can keep legacy message commands running smoothly, gradually migrate to slash commands, or build
hybrid experiences that combine both.