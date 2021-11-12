# Knub
Knub is a JavaScript/TypeScript framework for creating Discord bots.

## High-level overview
A bot built on Knub consists of one or more **plugins**.
For each **plugin context** (e.g. a Discord server ("guild")), Knub will create a new instance of each *plugin*
that should be loaded for the context. A *plugin context* is usually just one
server, but in the future it can also be a group of servers.

A *plugin* is simply a plain object that conforms to the `PluginBlueprint` interface.

Each plugin has access to a set of utility modules for setting up commands,
event listeners, user configuration, etc. Plugins are also able to specify
public interfaces that other plugins can use for interoperability, as well as
plugin dependencies.

The primary goals for Knub are:
* **Safety first** — Knub aims to make it easy to write safe code by default
* **Predictability** — any "magic" within Knub should be easy to reason about, and ideally the magic is left out in the first place
* **Automatic context-awareness** — guild plugins only have access to the context of the guild (server) they're loaded in by default
* **Extensive built-in functionality** — for common bot requirements

## Documentation
The documentation for Knub is currently a work in progress. For now, see the examples below and browse projects built
on Knub, such as [Zeppelin](https://github.com/Dragory/ZeppelinBot).

## Examples
For simplicity, the examples below only showcase a very limited subset of Knub's features.
Full examples for loading per-context configuration, advanced commands, event handling, global plugins, etc.
is coming in the near future.

### TypeScript example
```ts
import { Client, Intents } from "discord.js";
import { Knub, typedGuildPlugin, typedGuildCommand, BasePluginType } from "knub";

interface CustomPluginType extends BasePluginType {
  state: {
    counter: number;
  };
}

// We use a type helper, typedGuildCommand(), here to allow TypeScript to infer argument types and other types within the command object ("blueprint")
// See the JavaScript example further below for an example that uses plain objects instead!
const CounterCommand = typedGuildCommand<CustomPluginType>()({
  trigger: "counter",
  // Permission requirement must always be specified,
  // even if explicitly to mark the command public as done here
  permission: null,
  run({ message, pluginData }) {
    // Type of `pluginData.state.counter` is `number`
    message.channel.send(`Counter value: ${++pluginData.state.counter}`);
  },
});

// Another type helper here: typedGuildPlugin()
const CounterPlugin = typedGuildPlugin<CustomPluginType>()({
  name: "counter-plugin",

  commands: [
    CounterCommand,
  ],

  onLoad({ state }) {
    // Initialize counter for CounterCommand
    state.counter = 0;
  },
});

const client = new Client({ intents: [Intents.FLAGS.GUILDS] });
const knub = new Knub(client, {
  guildPlugins: [
    CounterPlugin,
  ]
});

knub.initialize();
client.login("my-bot-token");
```

### JavaScript example
This example doesn't use the type helpers used in the TypeScript example above, and instead uses plain objects wherever possible.

```js
const { Client, Intents } = require("discord.js");
const { Knub, baseCommandParameterTypeHelpers } = require("knub");

const t = baseCommandParameterTypeHelpers;

const MyCommand = {
  trigger: "echo",
  signature: {
    text: t.string(),
  },
  permission: null,
  run({ args, message }) {
    message.channel.send(args.text);
  },
};

const OtherCommand = {
  trigger: "ping",
  permission: null,
  run({ message }) {
    message.channel.send("Pong!");
  },
};

const MyPlugin = {
  name: "my-plugin",
  commands: [
    MyCommand,
    OtherCommand,
  ],
};

const client = new Client({ intents: [Intents.FLAGS.GUILDS] });
const knub = new Knub(client, {
  guildPlugins: [
    MyPlugin,
  ]
});

knub.initialize();
client.login("my-bot-token");
```
