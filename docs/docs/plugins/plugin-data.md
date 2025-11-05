---
sidebar_position: 6
---

# Plugin data

Many functions, such as `beforeLoad()`, `afterLoad()`, command `run()`, event listener `listener()`, etc.
receive an object called `pluginData` as one of their arguments.

This object is the "heart" of a plugin. It contains:
* Configuration helpers (`pluginData.config`)
* Command managers (`pluginData.messageCommands`, `pluginData.slashCommands`, `pluginData.contextMenuCommands`)
* Utility helpers (`pluginData.locks`, `pluginData.cooldowns`)
* Access to dependencies (`pluginData.getPlugin()` / `pluginData.getGlobalPlugin()`)
* Any custom internal state (`pluginData.state`)

If a function your plugin uses requires access to e.g. the plugin's config, you can pass this object to it.

## Config

You can use the `pluginData.config` object to access the plugin's config.
This object contains several functions that can be used to get the config with or without overrides applied:

### `pluginData.config.get(): config`
Returns the plugin's config without any overrides applied

### `pluginData.config.getForMessage(message): Promise<config>`
(Async) Returns the plugin's config with overrides applied based on the input message

### `pluginData.config.getForChannel(channel): Promise<config>`
(Async) Returns the plugin's config with overrides applied based on the input channel

### `pluginData.config.getForUser(user): Promise<config>`
(Async) Returns the plugin's config with overrides applied based on the input user

### `pluginData.config.getForMember(member): Promise<config>`
(Async) Returns the plugin's config with overrides applied based on the input member

### `pluginData.config.getMatchingConfig(matchParams): Promise<config>`
(Async) Returns the plugin's config with overrides applied based on the supplied match parameters.
See the type of matchParams for more details on what data can be passed.

## Message command manager

`pluginData.messageCommands` exposes a `PluginMessageCommandManager` instance that you rarely need to construct
yourself. Besides registering blueprints (handled automatically during plugin load), the manager exposes hooks that are
useful for analytics or migrations:

### `pluginData.messageCommands.onCommandAdded(listener)`
Subscribes to command registration events. The callback receives the command definition, the original blueprint, and
`pluginData`. The function returns an unsubscribe handler.

### `pluginData.messageCommands.onCommandDeleted(listener)`
Subscribes to command removal events. The callback additionally includes a `reason` field describing why the command was
removed (`"manual"`, `"deleted"`, or `"replaced"`).

### `pluginData.messageCommands.removeByTrigger(trigger)`
Removes the first command matching the provided trigger string and returns a boolean indicating whether anything was
removed. This is what Knub uses under the hood for `deletedMessageCommands`.

You can still call `pluginData.messageCommands.runFromMessage(message)` manually, but in most cases you should prefer the
global [`knub.dispatchMessageCommands`](../plugins/message-commands.md#manual-command-dispatch) helper to make sure all
plugins – guild and global – receive the message consistently.

## Custom state

One point mentioned above was **custom internal state**. In many cases, you want to store some state with your plugin.
This state can be accessed via `pluginData.state` and you can use a `PluginType` type to specify its type:

```ts
import { BasePluginType, guildPluginSlashCommand, guildPlugin } from "knub";

interface MyPluginType extends BasePluginType {
  state: {
    counter: number;
  };
}

const counterCmd = guildPluginSlashCommand({
  name: "counter",
  description: "Add one to the counter",
  signature: [],
  run({ interaction, pluginData }) {
    // Increment the counter in the plugin's internal state
    pluginData.state.counter++;
    // Report the current value back to the command user
    interaction.reply(`The counter is now: ${pluginData.state.counter}`);
  },
});

const counterPlugin = guildPlugin<MyPluginType>()({
  name: "counter",
  slashCommands: [
    counterCmd,
  ],
  beforeLoad(pluginData) {
    // Initialize the counter
    pluginData.state.counter = 0;
  },
});
```

Remember to initialize the state in `beforeLoad()` to avoid runtime errors!

**Note:** The state is only stored in memory and lost any time the plugin is reloaded or the bot is restarted, so don't use it for long-term storage.

When passing the `pluginData` object around, you want to make sure you still get full type checks everywhere.
To do this, you can use the `GuildPluginData<T>` type in your function parameters:

```ts
import { BasePluginType, GuildPluginData, guildPluginSlashCommand } from "knub";

interface MyPluginType extends BasePluginType {
  state: {
    counter: number;
  };
}

function incrementCounter(pluginData: GuildPluginData<MyPluginType>) {
  // The type of "pluginData.state" is now based on MyPluginType
  pluginData.state.counter++;
}

const counterCmd = guildPluginSlashCommand({
  name: "counter",
  description: "Add one to the counter",
  signature: [],
  run({ interaction, pluginData }) {
    // Call our increment function instead
    incrementCounter(pluginData);
    // Report the current value back to the command user
    interaction.reply(`The counter is now: ${pluginData.state.counter}`);
  },
});
```
