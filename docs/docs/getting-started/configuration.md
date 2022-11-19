---
sidebar_position: 4
---

# Configuration

There are several options you can configure when creating a Knub instance.
All options are optional.

## Available options

```ts
const knub = new Knub(djsClient, {
  guildPlugins: [], // An array of guild plugins
  globalPlugins: [], // An array of global plugins
  options: {
    // Whether to register plugin slash commands with Discord automatically on initialization
    autoRegisterSlashCommands: true,
    
    // A function that returns the global config or the config for a guild (server)
    // "id" is either a server ID or, for the global config, "global".
    // For more details, see the plugin configuration section of the docs.
    getConfig(id) {
      return {};
    },

    // A function that returns the names of the guild plugins that should be enabled
    // This function is called separately for each guild.
    // Use ctx.guildId to get the guild id, and ctx.config to get the guild config.
    getEnabledGuildPlugins(ctx, guildPlugins) {
      return Array.from(guildPlugins.keys());
    },

    // A function that returns whether the specified server should be loaded at all
    canLoadGuild(guildId) {
      return true;
    },

    // A function used mainly for internal Knub logging
    logFn(level, ...args) {
      // ...
    },
  },
});
```
