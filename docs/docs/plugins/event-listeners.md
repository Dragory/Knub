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
  // Required. Name of the event.
  event: "messageReactionAdd",
  // Required. Function that is run in response to the event.
  // "args" is a type-safe object with the event's data.
  listener({ args }) {
    // ...
  },
  // Whether to react to events from bots
  allowBots: false,
  // Whether to react to events from ourself
  allowSelf: false,
  // An array of filters to run before proceeding to "listener".
  // If any of these return false (or a promise resolving to false), the listener function won't be called.
  filters: [
    ({ args }) => {
      return false;
    },
  ],
})
```
