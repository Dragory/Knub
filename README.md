# Knub
Knub is a JavaScript/TypeScript framework for creating Discord bots.

## High-level overview
A bot built on Knub consists of one or more **plugins**.
For each **plugin context** (e.g. a Discord server ("guild")), Knub will create a new instance of each *plugin*
that should be loaded for the context. A *plugin context* is usually just one
server, but it can also be a group of servers.

A *plugin* can be one of the following:
* A plain object that conforms to the `PluginBlueprint` interface
* A class extending `PluginClass`

Each plugin has access to a set of utility modules for setting up commands,
event listeners, user configuration, etc. Plugins are also able to specify
public interfaces that other plugins can use for interoperability, as well as
plugin dependencies.

The primary goals for Knub are:
* **Automatic context-awareness** — plugin instances are restricted to their plugin context unless deliberately opted out
* **Predictability** — any "magic" within Knub should be easy to reason about, and ideally the magic is left out in the first place
* **Extensive built-in functionality** — for common bot requirements

## Documentation
The documentation for Knub is currently a work in progress. For now, see the examples below and browse projects built
on Knub, such as [Zeppelin](https://github.com/Dragory/ZeppelinBot).

## Examples
For simplicity, the examples below only showcase a very limited subset of Knub's features.
Full examples for loading per-context configuration, advanced commands, event handling, global plugins, etc.
is coming in the near future.

### JavaScript example
```js
const Eris = require("eris");
const { Knub, command, plugin, baseTypeHelpers } = require("knub");

const t = baseTypeHelpers;

const MyCommand = command("echo", { text: t.string() }, (args, { message }) => {
  message.channel.createMessage(args.text);
});

const OtherCommand = command("ping", (_, { message }) => {
  message.channel.createMessage("Pong!");
});

const MyPlugin = plugin("my-plugin", {
  commands: [
    MyCommand,
    OtherCommand,
  ]
});

const client = new Eris("my-bot-token");
const knub = new Knub(client, {
  guildPlugins: [
    MyPlugin,
  ]
});

knub.run();
```

### TypeScript example
```ts
import Eris from "eris";
import { Knub, plugin, command, BasePluginType } from "knub";

// Use a custom plugin type
interface CustomPluginType extends BasePluginType {
  state: {
    counter: number;
  };
}

const CounterCommand = command<CustomPluginType>()("counter", (_, { message, pluginData }) => {
  // Type of `pluginData.state.counter` is `number`
  message.channel.createMessage(`Counter value: ${++pluginData.state.counter}`);
});

const CounterPlugin = plugin<CustomPluginType>()("counter-plugin", {
  commands: [
    CounterCommand,
  ],

  onLoad({ state }) {
    // Initialize counter for CounterCommand
    state.counter = 0;
  },
});

const client = new Eris("my-bot-token");
const knub = new Knub(client, {
  guildPlugins: [
    CounterPlugin,
  ]
});

knub.run();
```
