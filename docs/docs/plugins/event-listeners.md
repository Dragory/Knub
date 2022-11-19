---
sidebar_position: 5
---

# Event listeners

Like plugins, event handlers in Knub are plain JavaScript objects.

There are two helper functions, `guildPluginEventListener()` and `globalPluginEventListener()`,
that can be used to create slash commands for guild plugins and global plugins respectively.

## A basic event listener example

```ts
const reactionListener = guildPluginEventListener({
  event: "messageReactionAdd",
  listener({ args }) {
    // Log the emoji of the reaction that was added
    console.log(args.reaction.emoji);
  },
})
```

### How to include it in a plugin:
```ts
guildPlugin({
  // ...
  events: [
    reactionListener,
  ],
  // ...
})
```

## Available properties

```ts
guildPluginEventListener({
  // Required: Name of the event 
  event: "",
})
```
