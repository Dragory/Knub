---
sidebar_position: 2
---

# Creating a plugin

A plugin in Knub is really just a "POJO" (**P**lain **O**ld **J**avaScript **O**bject):

```ts
const myGuildPlugin = {
  name: "my-plugin",
  configParser: () => ({}),
};
```

However, to get the full benefits of Knub's type inference, you should use the provided helper functions instead:

```ts
import { guildPlugin } from "knub";

const myGuildPlugin = guildPlugin({
  name: "my-plugin",
  configParser: () => ({}),
});
```

This way, you can get auto-completions for plugin properties, warnings for invalid values, etc.

## Available guild plugin options and their default values
```ts
const myPlugin = guildPlugin({
  // Required. Internal name of the plugin, must be unique.
  name: "",

  // Required. Parses untrusted input (from Knub's getConfig()) and returns a valid plugin config.
  // See the plugin configuration section of the docs for more details.
  configParser: () => ({}),
  
  // Default options for the plugin, including overrides.
  // See the plugin configuration section of the docs for more details.
  defaultOptions: {
    config: {},
    overrides: [],
  },
  
  // An array of slash commands included in the plugin.
  // See the slash commands section of the docs for more details.
  slashCommands: [],
  
  // A list of message commands included in the plugin.
  // See the message commands section of the docs for more details.
  messageCommands: [],
  
  // A "public interface" for the plugin accessible from other plugins.
  // See the plugin public interface section of the docs for more details.
  public: {},
  
  // A function that is called before plugins are loaded.
  // This is where you should e.g. initialize internal state for the plugin.
  beforeLoad(pluginData) {
    // ...
  },

  // A function that is called after all plugins have been loaded
  afterLoad(pluginData) {
    // ...
  },
  
  // A function that is called before plugins are unloaded.
  // If you have e.g. set up any timers, this is a good place to clean those up.
  // Keep in mind that other plugins *can still call your public interface* even after this function runs,
  // until the plugin is actually unloaded. So, don't clean up anything critical to the plugin's functionality.
  beforeUnload(pluginData) {
    // ...
  },
  
  // A function that is called after plugins have been unloaded
  afterUnload(pluginData) {
    // ...
  },
});
```
