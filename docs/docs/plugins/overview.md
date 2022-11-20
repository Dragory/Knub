---
sidebar_position: 1
---

# Overview

A bot built on Knub consists of one or more **plugins**.
These plugins can either be **guild plugins** or **global plugins**:

* **Guild plugins** are loaded and configured separately for each server.  
  Most of your plugins will be guild plugins!

* **Global plugins** are only loaded once, with a global configuration.  
  These are best used for handling DMs or creating bot owner commands.

Each plugin consists of **commands** and **event listeners**:

* **Commands** are, well, commands. Knub supports both [slash commands](slash-commands.md) and message commands, though the former is recommended for any new bots.
* **Event listeners** run in response to an event from the bot gateway. This is comparable to a plain `client.on("eventName", ...)` in discord.js.

## Program flow

```mermaid
flowchart TD;
    start[Program start]-->init
    init["knub.initialize()"]-->connect
    connect["djsClient.login()"]-->available
    available[Guild becomes available]
    
    init-->registerSlashCommands
    registerSlashCommands["Register slash commands with API"]
    
    available-->|Guild 1|canLoadGuild
    available-->|Guild 2|g2placeholder
    available-->|Guild 3|g3placeholder
    
    g2placeholder[...]
    g3placeholder[...]
    
    canLoadGuild["canLoadGuild()"]
    s1[Stop]
    canLoadGuild-->|true|getConfig
    canLoadGuild-->|false|s1
    getConfig["getConfig('guild id')"]-->getEnabledGuildPlugins
    getEnabledGuildPlugins["getEnabledGuildPlugins()"]
    
    getEnabledGuildPlugins-->|Plugin 1|p1InitPluginData
    getEnabledGuildPlugins-->|Plugin 2|p2InitPluginData
    getEnabledGuildPlugins-->|Plugin 3|p3InitPluginData
    
    p1InitPluginData["Initialize plugin data"]-->p1BeforeLoad
    p1BeforeLoad["beforeLoad()"]-->p1LoadCommands
    p1LoadCommands["Load commands, \n  event listeners, etc."]-->waitForLoad
    p2InitPluginData["Initialize plugin data"]-->p2BeforeLoad
    p2BeforeLoad["beforeLoad()"]-->p2LoadCommands
    p2LoadCommands["Load commands, \n  event listeners, etc."]-->waitForLoad
    p3InitPluginData["Initialize plugin data"]-->p3BeforeLoad
    p3BeforeLoad["beforeLoad()"]-->p3LoadCommands
    p3LoadCommands["Load commands, \n  event listeners, etc."]-->waitForLoad
   
    
    waitForLoad["Wait for every plugin's loading to finish"]
    waitForLoad-->|Plugin 1|p1AfterLoad
    waitForLoad-->|Plugin 2|p2AfterLoad
    waitForLoad-->|Plugin 3|p3AfterLoad
    
    p1AfterLoad["afterLoad()"]
    p2AfterLoad["afterLoad()"]
    p3AfterLoad["afterLoad()"]
```
