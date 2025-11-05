---
sidebar_position: 2
---

# Creating a plugin

Every Knub plugin is described by a **blueprint** – a plain object that tells Knub how to load the plugin and what
features it exposes. You’ll almost always create blueprints with the helper functions exported from `knub`, as they
provide strong typing and sensible defaults.

```ts
import { guildPlugin } from "knub";

const myGuildPlugin = guildPlugin({
  name: "my-plugin",
  configSchema: z.strictObject({}),
});
```

The helper call returns a blueprint that Knub can load. The same pattern works for global plugins by swapping in
`globalPlugin()`.

## Defining the plugin type

Blueprint helpers become most useful when you describe your plugin with a **PluginType**. This controls the shape of
your config, any custom override criteria, and the plugin’s internal state.

```ts
import { BasePluginType, guildPlugin } from "knub";
import z from "zod";

interface CooldownPluginType extends BasePluginType {
  configSchema: z.ZodType<{ cooldownMs: number }>;
  state: {
    activeCooldowns: Map<string, number>;
  };
}

const cooldownPlugin = guildPlugin<CooldownPluginType>()({
  name: "cooldown",
  configSchema: z.strictObject({
    cooldownMs: z.number().default(1000),
  }),
  defaultOverrides: [],
  beforeLoad(pluginData) {
    pluginData.state.activeCooldowns = new Map();
  },
});
```

Once a type is provided, TypeScript can infer configuration values and `pluginData.state` everywhere the plugin is used.

## Blueprint properties

The table below summarises the most important blueprint fields. Unless noted otherwise, they are shared between guild
and global plugins.

| Property | Required | Description |
| --- | --- | --- |
| `name` | ✅ | Internal identifier for the plugin. Must be unique across all loaded plugins. |
| `configSchema` | ✅ | zod schema describing the plugin’s configuration. It is used to validate user input and infer types. |
| `defaultOverrides` | ⛔️ | Array of overrides applied unless a guild replaces them. See [Plugin configuration](plugin-configuration.md). |
| `dependencies` | ⛔️ | Function returning other blueprints that must load before this one. Automatically loaded for the context. |
| `messageCommands` | ⛔️ | Array of message command blueprints. See [Message commands](message-commands.md). |
| `deletedMessageCommands` | ⛔️ | Array of legacy message command triggers that should be removed if present. Useful for compatibility or migrations. |
| `slashCommands` | ⛔️ | Array of slash command or slash group blueprints. |
| `contextMenuCommands` | ⛔️ | Array of user/message context menu command blueprints. |
| `events` | ⛔️ | Array of event listener blueprints. |
| `customOverrideCriteriaFunctions` | ⛔️ | Map of custom override matchers for configuration overrides. |
| `public` | ⛔️ | Function returning a public interface object exposed to other plugins via `pluginData.getPlugin()`. |
| Lifecycle hooks | ⛔️ | `beforeLoad`, `beforeStart`, `afterLoad`, `beforeUnload`, `afterUnload`. Each hook receives `pluginData`. |

Guild and global plugins expose the same fields, with the exception that guild plugins receive a guild-specific
`pluginData` (containing guild, member utilities, etc.) while global plugins interact with the global context.

### Lifecycle hook order

When Knub loads a plugin instance it executes the hooks in the following order:

1. `beforeLoad`
2. `beforeStart`
3. Register events, commands, and other resources
4. `afterLoad`

When unloading the plugin the order is:

1. `beforeUnload`
2. Resources are torn down
3. `afterUnload`

Plugins that are only loaded because another plugin depends on them have `pluginData.loadedAsDependency === true`. They
still execute hooks, but Knub will skip registering their commands and event listeners.

## Public interfaces

If a plugin exposes functionality to other plugins, define a `public` function on the blueprint. Whatever this function
returns becomes available through `pluginData.getPlugin()` or `pluginData.getGlobalPlugin()` (depending on context).

```ts
const clockPlugin = guildPlugin({
  name: "clock",
  configSchema: z.strictObject({ tz: z.string().default("UTC") }),
  public(pluginData) {
    return {
      getCurrentTime() {
        const config = pluginData.config.get();
        return formatTz(new Date(), config.tz);
      },
    };
  },
});

const announcerPlugin = guildPlugin({
  name: "announcer",
  configSchema: z.strictObject({}),
  dependencies: () => [clockPlugin],
  beforeStart(pluginData) {
    const clock = pluginData.getPlugin(clockPlugin);
    pluginData.state.sayTime = () => clock.getCurrentTime();
  },
});
```

Public interfaces are only available after `beforeStart` has completed. Attempting to access them earlier throws an
error, which helps catch dependency ordering issues during development.

## Message command removals

The optional `deletedMessageCommands` array removes commands that match the listed triggers (usually legacy aliases).
Knub performs the removal before registering new commands, allowing you to ship migrations without manual cleanup.
See [Message commands](message-commands.md#deleted-commands) for full details.

## Global plugins

Creating a global plugin mirrors the guild plugin process, except the plugin operates without a guild context:

```ts
import { globalPlugin } from "knub";

const dmForwarder = globalPlugin({
  name: "dm-forwarder",
  configSchema: z.strictObject({
    logChannelId: z.string(),
  }),
  events: [
    globalPluginEventListener({
      event: "messageCreate",
      allowBots: false,
      listener({ pluginData, args: { message } }) {
        if (!message.guild) {
          const config = pluginData.config.get();
          // Forward to log channel…
        }
      },
    }),
  ],
});
```

Global plugins can interact with guild plugins by exposing a public interface and using
`pluginData.getGlobalPlugin()` from guild plugin contexts.
