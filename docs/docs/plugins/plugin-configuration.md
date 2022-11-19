---
sidebar_position: 3
---

# Plugin configuration

Each plugin can be configured individually for each guild (server).
Plugin configuration is included in each server's config ([see also: `getConfig` Knub option](../getting-started/configuration.md)).

## Server configuration

A server configuration has the following basic format. Note the plugin configuration section, where each plugin gets their configuration from.

```json5
{
  // Optional. Message command prefix.
  "prefix": "!",
  
  // Role- and user-specific permission levels for plugin configuration
  "levels": {
    "role id": 100,
    "user id": 50
  },
  
  // Plugin configuration
  // The key in the object is the plugin's internal name
  "plugins": {
    // Configuration for plugin "my-plugin"
    "my-plugin": {
      // Base configuration, before overrides
      "config": {
        "coolness": 0
      },
      // Overrides
      // For more details, see "Overrides" section further below
      "overrides": [
        // When level (see "levels" above) is 50 or greater, set "coolness" to 10
        {
          "level": ">=50",
          "config": {
            "coolness": 10
          }
        },
        // When level (see "levels" above) is 100 or greater, set "coolness" to 10000
        {
          "level": ">=100",
          "config": {
            "coolness": 10000
          }
        }
      ]
    }
  }
}
```

## Overrides

Overrides can be used to change a plugin's configuration for a specific role, user, channel, etc.
These overrides are applied automatically when checking message command permissions, and also when getting
config within a command or event listener with e.g. `pluginData.config.getForMember(member)`.

For example, with the configuration above:
```ts
// Assuming this command is within the plugin "my-plugin"...
guildPluginSlashCommand({
  // ...
  async run({ pluginData, interaction }) {
    const userConfig = await pluginData.config.getForUser(interaction.user.id);
    // If the user has the role id for level 100: "Your coolness: 10000"
    // If the user has the user id for level 50: "Your coolness: 10"
    // Otherwise: "Your coolness: 0"
    interaction.reply(`Your coolness: ${userConfig.coolness}`);
  }
})
```

### Override examples

Note: `can_kick` in these examples is entirely arbitrary and does not inherently grant any permissions.

```json5
{
  "plugins": {
    "example_plugin": {
      // Base config
      "config": {
        "can_kick": false,
        "kick_message": "You have been kicked",
        "nested": {
          "value": "Hello",
          "other_value": "Foo"
        }
      },
      
      // Overrides
      "overrides": [
        // Simple permission level based override to allow kicking only for levels 50 and up
        {
          "level": ">=50",
          "config": {
            "can_kick": true,
            "nested": {
              "other_value": "Bar"
            }
          }
        },
        // Channel override - don't allow kicking on the specified channel
        {
          "channel": "109672661671505920",
          "config": {
            "can_kick": false
          }
        },
        // Don't allow kicking from any thread
        {
          "is_thread": true,
          "config": {
            "can_kick": false
          }
        },
        // Don't allow kicking from a specific thread
        {
          "thread_id": "109672661671505920",
          "config": {
            "can_kick": false
          }
        },
        // Don't allow kicking within a specific category
        {
          "category": "360735466737369109",
          "config": {
            "can_kick": false
          }
        },
        // Multiple channels. If any of them match, this override applies.
        {
          "channel": ["109672661671505920", "570714864285253677"],
          "config": {
            "can_kick": false
          }
        },
        // Give a specific role permission to kick
        {
          "role": "172950000412655616",
          "config": {
            "can_kick": true
          }
        },
        // Match based on multiple roles. The user must have ALL roles mentioned here for this override to apply.
        {
          "role": ["172950000412655616", "172949857164722176"],
          "config": {
            "can_kick": true
          }
        },
        // Match on user id
        {
          "role": "106391128718245888",
          "config": {
            "kick_message": "You have been kicked by Dragory"
          }
        },
        // Match on multiple conditions
        // All of them must apply
        {
          "channel": "109672661671505920",
          "role": "172950000412655616",
          "config": {
            "can_kick": false
          }
        },
        // Match on ANY of multiple conditions
        {
          "any": [
            { "channel": "109672661671505920" },
            { "role": "172950000412655616" }
          ],
          "config": {
            "can_kick": false
          }
        },
        // Match on either of two complex conditions
        {
          "any": [
            {
              "all": [
                { "channel": "109672661671505920" },
                { "role": "172950000412655616" },
                {
                  "not": {
                    "role": "473085927053590538"
                  }
                }
              ]
            },
            {
              "channel": "534727637017559040",
              "role": "473086848831455234",
            }
          ],
          "config": {
            "can_kick": false
          }
        }
      ]
    }
  }
}
```
