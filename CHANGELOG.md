# 18.0.5
* Fix type error when specifying global plugins to load

# 18.0.4
* Fix missing `ts-essentials` dependency

# 18.0.3
* Make Plugin TConfig and TPermissions types less strict (no longer requires an index signature)
* Add the same generics to GlobalPlugin as Plugin

# 18.0.2
* Fix overrides with modifiers being marked as invalid when using config/permission types

# 18.0.1
* Fix overrides requiring full plugin config/permissions when using config/permission types
* Tweak plugin option types to work more reliably

# 18.0.0
* Remove support for "runtime options" in IKnubArgs
  * If you need to override a plugin's default options, extend that plugin instead!
* Remove support for overriding a plugin's name in IKnubArgs
  * See above
* Changes to config value usage in plugins:
  * Remove the following configValue functions:
    * `configValue()`
    * `configValueForMemberIdAndChannelId()`
    * `configValueForMsg()`
    * `configValueForChannel()`
    * `configValueForUser()`
    * `configValueForMember()`
  * Add the following new getConfig functions:
    * `getConfig()`
    * `getMatchingConfig()`
    * `getConfigForMemberIdAndChannelId()`
    * `getConfigForMsg()`
    * `getConfigForChannel()`
    * `getConfigForUser()`
    * `getConfigForMember()`
  * Add optional generic types to Plugin that define the type of the plugin's config and permissions
  * These changes were made to allow proper static analysis of config and permission values in plugin code
* Update to Typescript 3.3(.3333)

# 17.2.0
* Add `Knub.getLoadedGuilds()`

# 17.1.0
* Add support for cooldowns. Cooldowns can be set on commands via the `cooldown` and `cooldownPermission` command
  config values, or with the new `cooldown(time, permission)` decorator. If the permission is set, users *with* this
  permission are exempt from the cooldown. Cooldowns can also be managed manually in plugins via `this.cooldowns`, or by
  creating your own `CooldownManager` object.

# 17.0.1
* Fix type error that prevented the build from.. building

# 17.0.0
* Remove blocking functionality
* Add locks. Locks can be acquired in plugins via `this.locks.acquire(string|string[])` or with the new `lock`
  decorator, and then unlocked via `lock.unlock()` (done automatically with the decorator).  
  When using locks, the promise returned by `acquire()` will wait for the old matching locks to unlock before resolving.
  This replicates the old blocking functionality, but is opt-in and more flexible by allowing you to be as specific as
  you want with your locks.
  * There is, by default, a 10 second timeout after which locks will automatically unlock, similar to the timeout with
    blocking before. This can be changed by calling `setLockTimeout` on a `LockManager` instance, by passing in the
    desired lock timeout as the first parameter when creating a `LockManager`, or by giving the lock timeout as the second
    parameter to `acquire()`. Lock timeouts are always specified in milliseconds.
  * When using the decorator, the lock object is also passed to the event/command handler:
    * For events, as an extra argument at the end
    * For commands, as part of the `command` object that's passed as the last argument

# 16.4.0
* Add performance debug functionality

# 16.3.0
* Errors thrown in a Plugin's onLoad() no longer crash the bot, but show a warning in the console (and the plugin won't be marked as loaded)

# 16.2.0
* Changed the following properties/methods of `Plugin` from `private` to `protected`:
  * `guildConfig` (property)
  * `pluginOptions` (property)
  * `mergedPluginOptions` (property)
  * `getMergedOptions()` (method)
  * `clearMergedOptions()` (method)
  * `runCommandsInMessage()` (method)
* The installed package should no longer contain certain unneeded files

# 16.1.1
* Fix invalid command parsing when using multiple options

# 16.1.0
* Add `bool` / `boolean` type for command options (and arguments)
  * A command option used as a "switch" (i.e. just `--option`) with the bool type have its value converted to `true`
  * Otherwise, all values are truthy except "false" and "0"

# 16.0.1
* Fix error when matching commands without any options

# 16.0.0
* Rename command definition "options" property to "config"
* Commands now support options (`--option=value`), defined in `config.options`
  * For commands in plugins, option values will be placed in the same args object (second argument to command handler)
    as the matched command arguments

# 15.1.0
* Errors in plugin event handlers and commands are now thrown as a `PluginError`
* Fix error when resolving user id from an unknown message in `Plugin.hasPermission`

# 15.0.1
* Add safeguard for unknown channel when converting typingStart event to a guild
* Remove typingStop from utils.eventToGuild (wasn't being used anymore)

# 15.0.0
* Add `Plugin.hasPermission()`  
  This is also used internally to check for command/event permissions, so it should now be easy to replicate that
  functionality in custom message/event handlers and similar use cases.
* Allow overriding all known surrounding/nested config/permission values by specifying a config/permission value with
  the key `*`. Useful for e.g. setting all permissions at once in an override.

# 14.0.0
* Plugins and global plugins are now listed in an array instead of an object in the Knub constructor.
* Plugins are now expected to specify their own static `pluginName` property.
  This can be overridden by the user, however, so if your plugin needs to access its own name at runtime for whatever
  reason, the new `runtimePluginName` property should be used.
* Only the first matched command that passes all checks is run for any message. This allows e.g. having both a wildcard
  and hardcoded command parameters simultaneously by putting the hardcoded parameter in the command name itself and
  declaring it before the wildcard command.

# 13.1.0
* Added the following utility functions to resolve Eris/Discord objects from strings that contain IDs, mentions, etc:
  * utils.resolveUser
  * utils.resolveMember
  * utils.resolveChannel
  * utils.resolveRole

# 13.0.1
* Fixed channel mention matching. Match snowflakes more strictly.

# 13.0.0
* Commands no longer match when extra arguments are present. Rest and catch-all parameters can still be used as normal.

# 12.2.2
* Fix `"messageDeleteBulk"` event being swallowed when restricted to `"guild"`

# 12.2.1
* Fix falsy ignoreSelf and restrict params being ignored in `event` decorator

# 12.2.0
* Add `Plugin.configValueForMemberIdAndChannelId()`

# 12.1.1
* Fix type definition for LoggerFn (`msg, level` -> `level, msg`)

# 12.1.0
* Add `nonBlocking()` decorator (accessible through the same decorator object as `command` and `event`) that makes the event listener/command handler non-blocking (see [12.0.0](#1200) below)

# 12.0.0
* Event handlers in plugins are now run sequentially, waiting for any promises returned to resolve before running the next handler
  * If you don't need this behaviour, simply don't return a promise from your event/command handler
  * This also affects commands, though note that commands were already run sequentially before this update - this change just makes it so commands *across different plugins* also run sequentially.
* Increase startup timeout warning delay from 10sec to 30sec
  * I.e. the "This is taking unusually long. Check the token?" warning

# 11.1.0
* Add `Plugin.hasPlugin()` and `Plugin.getPlugin()` for easier and more standardized interoperability between plugins

# 11.0.0
* Replace default YAML config files with JSON
  * Removes dependency on js-yaml
* Replace default winston logger with a custom function
  * Removes dependency on winston
* Allow specifying a custom logging function
  * `logFn` in Knub constructor argument `userArgs.options`
* Update to TypeScript 3.1
* Knub now requires Node.js 10 or higher

# 10.1.0
* Add `waitForReply` helper

# 10.0.0
* Default plugin overrides are now included *after* user overrides.
This is, in most cases, more intuitive, because it allows e.g. default mod overrides to apply even if the user specifies their own overrides.
* Allow specifying "=overrides" in plugin config to replace default overrides entirely

# 9.6.6
* Fix infinite loop when reloading all global plugins

# 9.6.5
* Fix error when reloading global plugins

# 9.6.4
* Allow arbitrary props in guild and global config

# 9.6.3
* Add `getGlobalConfig` function to the Knub instance

# 9.6.2
* Fix `getEnabledPlugins` being called with a weird `this`

# 9.6.1
* Fix `userId` and `channelId` parameter types

# 9.6.0
* Allow applying multiple decorators for commands or events for one function

# 9.5.1
* Move argument type conversion before command error handling. This should help with parameter-overloaded commands.

# 9.5.0
* Add `userId` and `channelId` command parameter types

# 9.4.14
* Fix `commandUtils.convertToType` accepting invalid number values for number params

# 9.4.13
* Fix `waitForReaction` ignoring all reactions to bot messages

# 9.4.12
* Add `restrictToUserId` param to `waitForReaction` helper

# 9.4.11
* Fix slow reaction adding in waitForReaction

# 9.4.10
* Fix "missing argument" errors being shown for commands that you don't have a permission to run

# 9.4.9
* Ignore errors when removing reactions from the `waitForReaction()` message

# 9.4.8
* Fix `waitForReaction()` reacting to its own reactions (heh)

# 9.4.7
* Fix `waitForReaction()` failing to add the reactions

# 9.4.6
* Add timeout parameter to `waitForReaction()` (default 15sec)

# 9.4.5
* Null/undefined values for command parameters are no longer converted to the specified type.
This fixes e.g. a missing string argument getting the value "null" (as a string).

# 9.4.4
* Fixed error when using optional catchAll arguments

# 9.4.3
* Global config is now properly loaded from `global.yml` by default

# 9.4.2
* Fix `mergeConfig()` error when merging a null value

# 9.4.1
* Fix `Plugin.getMergedConfig()` throwing an error if default plugin options don't contain a `config` or `permissions` key

# 9.4.0
* Change default `getEnabledPlugins()` function so all plugins, except those that are explicitly disabled, are loaded by default

# 9.3.0
* Change default `getEnabledPlugins()` function so it respects the plugin's `enabled` value (only if explicitly disabled)

# 9.1.0
* Overrides from default plugin options and actual plugin options are now concatted instead of overwritten
* Exported various interfaces to help with typings

# 9.0.1
* Fix default value being required for `Plugin.configValue()`

# 9.0.0
* Switch from Discord.js to Eris
* New config format

# 7.0.3
* Pass the plugin object as the third argument in the `guildPluginLoaded` and `guildPluginUnloaded` events

# 7.0.1-7.0.2
* Lock Discord.js version to 11.3.2

# 7.0.0
* Allow passing runtime config to Plugins and GlobalPlugins by passing an array of `[Plugin, <config>]` in `plugins` or `globalPlugins`.
This runtime config is available to plugins in `this.runtimeConfig`. If no config is passed (i.e. by using the regular way of setting plugins), `this.runtimeConfig` is set to `null`.

# 6.3.1
* Fix `Knub.getGuildData()`

# 6.3.0
* Add `Knub.getGuildData()`

# 6.2.0
* Knub now extends `EventEmitter` and emits several events:
  * `loadingFinished`
  * `guildLoaded`
  * `guildUnloaded`
  * `guildPluginLoaded`
  * `guildPluginUnloaded`
  * `globalPluginLoaded`
  * `globalPluginUnloaded`

# 6.1.0
* Add `Knub.getPlugins()` and `Knub.getGlobalPlugins()`

# 6.0.0
* Knub now takes an arguments object as the first and only argument
* Changed default prefix from ! to mentioning the bot
* Added global plugins
  * Loaded once when the bot is started. Can be reloaded with `Knub.reloadAllGlobalPlugins()`
  * exported as `GlobalPlugin`
  * Registered just like regular plugins, but using the `globalPlugins` property instead
  * Non-guild-specific permissions
* Guild/channel/user/message checks for events should now be more reliable
* Renamed `Plugin.parent` to `Plugin.knub`
