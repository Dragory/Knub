---
sidebar_position: 3
---

# Plugin configuration

Each plugin can be configured individually for every guild (server). Plugin configuration travels through the value
returned from [`getConfig`](../getting-started/configuration.md) and is validated against the blueprint’s
`configSchema` on load. Guild and global plugins share the same configuration format; the only difference is which
context Knub evaluates overrides against.

## Server configuration shape

A typical guild configuration looks like the following. Notice how each plugin gets its own configuration block inside
`plugins`.

```json
{
  "prefix": "!",
  "levels": {
    "role id": 100,
    "user id": 50
  },
  "plugins": {
    "my-plugin": {
      "config": {
        "coolness": 0
      },
      "overrides": [
        {
          "level": ">=50",
          "config": {
            "coolness": 10
          }
        },
        {
          "level": ">=100",
          "config": {
            "coolness": 10000
          }
        }
      ],
      "replaceDefaultOverrides": false
    }
  }
}
```

- `prefix` – Optional. Overrides the message command prefix for this guild. Knub falls back to `@BotName ` if omitted.
- `levels` – Optional. Custom permission levels used by overrides and permission checks. Keys are user/role IDs.
- `plugins` – Required. Map of plugin name → plugin options.
  - `config` – An object that must satisfy the plugin’s `configSchema`.
  - `overrides` – Optional list of overrides that are evaluated in order. More on this below.
  - `replaceDefaultOverrides` – Optional boolean. When true, the plugin’s blueprint `defaultOverrides` are ignored and
    only the overrides listed here are applied.

## Overrides

Overrides allow you to tweak part of the plugin configuration for specific conditions: users, roles, channels,
threads, categories, custom predicates, and more. Overrides declared in the guild config are merged with the
`defaultOverrides` defined on the plugin blueprint unless `replaceDefaultOverrides` is set.

Overrides are evaluated automatically when Knub runs permission and cooldown checks for message commands or when you
query configuration via helpers such as `pluginData.config.getForMember(member)`.

For example, given the configuration above:

```ts
import { guildPluginSlashCommand } from "knub";

const whoIsCoolCommand = guildPluginSlashCommand({
  name: "whoiscool",
  description: "Show your coolness level",
  run: async ({ pluginData, interaction }) => {
    const config = await pluginData.config.getForUser(interaction.user);
    await interaction.reply(`Your coolness: ${config.coolness}`);
  },
});
```

A user with the level 100 role would see `10000`, a user with the level 50 ID would see `10`, and everyone else would
see `0`.

### Override criteria

Each override supports the following built-in selectors (all optional):

- `level` – Matches when the user’s level (from the guild’s `levels` map) meets the expression, e.g. `"level": ">=50"`.
- `channel` / `channels` – Restrict to specific channel IDs.
- `category` / `categories` – Restrict to channel categories.
- `user` / `users` – Restrict to specific users.
- `role` / `roles` – Restrict to members with specific roles.
- `thread` / `threads` – Restrict to specific threads.
- `is_thread` – Boolean to match thread vs non-thread messages.
- `any`, `all`, `not` – Logical combinators for nesting criteria.

Plugins can extend this with custom criteria via `customOverrideCriteriaFunctions` on the blueprint.

### Override examples

```json
{
  "plugins": {
    "example_plugin": {
      "config": {
        "can_kick": false,
        "kick_message": "You have been kicked",
        "nested": {
          "value": "Hello"
        }
      },
      "overrides": [
        {
          "level": ">=50",
          "config": {
            "can_kick": true
          }
        },
        {
          "roles": ["1234"],
          "config": {
            "kick_message": "You have been kicked, valued moderator"
          }
        },
        {
          "channels": ["5678"],
          "config": {
            "nested": {
              "value": "Hello channel 5678!"
            }
          }
        }
      ]
    }
  }
}
```

The overrides above (1) grant kick permissions to anyone with level ≥ 50, (2) change the message for members with role
`1234`, and (3) customise a nested value inside a specific channel.

## Validating configuration with `configSchema`

Knub relies on the `configSchema` defined on your plugin blueprint to validate untrusted configuration and provide type
information throughout your code. You typically use zod for this:

```ts
import { BasePluginType, guildPlugin } from "knub";
import z from "zod/v4";

const configSchema = z.strictObject({
  coolness: z.number().default(0),
  alertChannelId: z.string().optional(),
});

interface MyPluginType extends BasePluginType {
  configSchema: typeof configSchema;
}

export const myPlugin = guildPlugin<MyPluginType>()({
  name: "my-plugin",
  configSchema,
  defaultOverrides: [],
});
```

Because the schema sets defaults, guilds can omit those keys and still receive the merged values when calling
`pluginData.config.get()` or its variants.

If you need plugin-specific override behaviour, include `customOverrideCriteriaFunctions` in the blueprint and refer to
those functions by name within your overrides. The configuration will be rejected if an override references an unknown
criterion, which keeps typos from silently failing at runtime.

## Accessing configuration at runtime

Once the plugin is loaded you can access validated config through the helpers on `pluginData.config`:

- `pluginData.config.get()` – Returns the base config without overrides.
- `pluginData.config.getMatchingConfig(matchParams)` – Generic helper used by the other methods.
- `pluginData.config.getForMessage(message)` – Applies overrides relevant to the supplied message.
- `pluginData.config.getForChannel(channel)` – Applies overrides relevant to a channel or thread.
- `pluginData.config.getForUser(user)` – Applies user-specific overrides.
- `pluginData.config.getForMember(member)` – Applies overrides with member/role context.
- `pluginData.config.getForInteraction(interaction)` – Useful in slash commands and context menu handlers.

All access helpers respect permission levels, channel selectors, and custom criteria exactly the same way they behave for
message command permissions.
