---
sidebar_position: 3
---

# Basic usage

```ts
import { Client, GatewayIntentBits } from "discord.js";
import { Knub, guildPlugin, guildPluginSlashCommand, slashOptions } from "knub";

// Create a command
const echoCommand = guildPluginSlashCommand({
  name: "echo",
  description: "Repeats what you say",
  signature: [
    slashOptions.string({ name: "text", description: "", required: true }),
  ],
  run({ interaction, options }) {
    interaction.reply(options.text);
  },
});

// Create a plugin and give it the command
const myPlugin = guildPlugin({
  name: "my-plugin",
  configParser: () => ({}),

  slashCommands: [
    echoCommand,
  ],
});

// Create a discord.js client
const djsClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
  ],
});

// Tie it all together with Knub
const knub = new Knub(djsClient, {
  guildPlugins: [
    myPlugin,
  ],
});

// Initialize Knub and connect to the bot gateway
knub.initialize();
djsClient.connect("YOUR TOKEN HERE");
```
