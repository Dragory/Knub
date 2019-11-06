# 26.1.0
* Add `Plugin.runCommand()`
  * This function is used internally to run matching commands from messages and can also be used to manually trigger
    a specific command
* New helper functions:
  * `splitIntoCleanChunks()` - Splits a string into chunks of the specified length, preferring to split at newlines
  * `splitMessageIntoChunks()` - Building on the above, splits a message's content into smaller chunks if the content is
    longer than Discord's message limit (2000). Retains leading and trailing line breaks, open code blocks, etc.
  * `createChunkedMessage()` - Building on the above, sends a chunked message to the specified channel
* `getInviteLink()` helper now includes `https://` at the start
* Fix role id detection from role mentions in the `role` parameter type and `resolveRole` utility function
* Add the proper type for the `command` parameter in `TCommandHandler`

# 26.0.2
* More `getCommandSignature()` clean-up

# 26.0.1
* Fix messy triggers in `getCommandSignature()` when using regular, non-regex triggers

# 26.0.0
* Update `knub-command-manager` to v6.0.0.
  [See full changelog here.](https://github.com/Dragory/knub-command-manager/blob/master/CHANGELOG.md#600)
  The main backwards compatibility breaking change here is that both `--option` and `-option` are now valid, as well as
  both `-o` and `--o`.
* Update Eris peer dependency to v0.11.0.
  [See full changelog here.](https://github.com/abalabahaha/eris/releases/tag/0.11.0)
* Export `TypeConversionError` from knub-command-manager so that bots built on Knub can use `instanceof` against it even
  if they have a different version of knub-command-manager required locally (and thus not deduped in node dependencies).

# 25.0.1
* `getCommandSignature()`: fix prefix showing as a full regex toString() instead of just the pattern
* Wrap command usage info in an inline code block when encountering an error when matching a command

# 25.0.0
* **BREAKING CHANGE:** `configUtils.getMatchingPluginOptions` is now `configUtils.getMatchingPluginConfig`, returning
  only the config part of the passed options instead of the whole options object
* **BREAKING CHANGE:** Overrides no longer support the `type` option ("all"/"any"). All criteria are now required to
  match for the override to apply, except when using the new `all` and `any` criteria, which are described in the next
  bullet point.
* Add support for chaining override criteria with new `all` and `any` special criteria. The value for either of these
  should be an array of further sets of criteria to evaluate.
  * `all` only evaluates to `true` if *every* set of criteria within it also evaluate to `true`
  * `any` evaluates to `true` if *any* set of criteria within it evaluates to `true`
  * An empty array as the value for either of these evaluates to `false`
* Add `not` special override criterion. Its value should be a set of criteria to evaluate. If the set of criteria
  matches, `not` evaluates to `false` and vice versa.
* Add support for custom override criteria
  * `Plugin` now has a second generic type that defines the type of an optional `extra` key in overrides
  * `Plugin.matchCustomOverrideCriteria` can be defined by plugins to resolve these custom override criteria
* Empty override criteria now always evaluate to `false`, i.e. don't match
  * I.e. an override with just the `config` property or none at all
  * Plugins can naturally choose to treat their *custom* criteria however they want, e.g. evaluate to `true` by default

# 24.1.2
* Fix decorator command pre-filters (e.g. permission checks) being run on *all* loaded servers, not just the current one

# 24.1.1
* Fix error when compiling the project on a case-sensitive file system

# 24.1.0
* Update `knub-command-manager` to v5.2.0, restoring support for async type conversion functions

# 24.0.1
* Fix regression where command arguments were no longer being passed to the command handler as the argument value, but
  the full argument object instead. Arguments are now passed as values again, as intended.

# 24.0.0
* **BREAKING CHANGE:** Interfaces/types from `knub-command-manager` are no longer exported from Knub.
  To use them in your project, add `knub-command-manager` as a dependency to the project instead.
* Update `knub-command-manager` to v5, returning support for command signature overloads (though without doing it the
  hacky way - adding a new command for each overload/signature - this time)
* Update the signature of `getCommandSignature()` to no longer require passing the prefix/trigger.
  Trigger and signature can now be overwritten with 2 new optional arguments.

# 23.2.0
* Export extra types:
  * `ICommandContext`
  * `ICommandExtraData`
  * `IKnubPluginCommandDefinition`
  * `IKnubPluginCommandConfig`
  * `IKnubPluginCommandManager`

# 23.1.0
* Update `knub-command-manager` to `4.4.0`. This allows accessing the original sources of command triggers via
  `command.originalTriggers`.

# 23.0.0
This release contains lots of **BREAKING CHANGES**. You have been warned!

* Commands are now managed through `knub-command-manager`.
  * Accessing `this.commands` in plugins is no longer supported (use `this.addCommand()`, `this.removeCommand()`, and
    `this.getRegisteredCommands()` instead)
  * Command config types have changed somewhat: several values are now under `config.extra` instead
  * Custom argument type functions now get a context object as the second parameter
  * Potentially other changes. TypeScript should warn about most of them as long as they are type-related.
* Remove modifier support from `configUtils.mergeConfig` (e.g. "+arrayProp" or "-arrayProp")
  * Modifiers made static analysis harder and were generally not very well documented.
    Most of their functionality can be replaced with a different plugin config structure instead (e.g. named groups).
* Remove "target" param from `configUtils.mergeConfig` (now always returns a new object)
* Replace usages of lodash.at with a custom function, remove all lodash dependencies
* Instead of "=overrides" to replace overrides, add a new replaceDefaultOverrides property to plugin config
* PermissionDecorator, CooldownDecorator, and LockDecorator now modify the commands/events decorator metadata directly
  instead of being applied in `Plugin.runLoad()`
  * This improves static access to plugin commands/event handlers
  * Decorators can still be used in any order
* Add exported `pluginUtils` object with the following functions:
  * `getPluginDecoratorCommands()` - returns command decorator metadata of the plugin statically
  * `getPluginDecoratorEventListeners()` - returns event listener decorator metadata of the plugin statically
* Fix bug where a guild was not properly unloaded if it had 0 plugins loaded

# 22.0.0
* **BREAKING CHANGE:** Deprecate `description` property from `ICommandConfig` in favor of new, arbitrary type `info` property
* **BREAKING CHANGE:** Deprecate `name` and `description` properties from `Plugin` in favor of new, arbitrary type `pluginInfo` property
  * Note that the `pluginName` property for the plugin's internal name still exists and is still required

# 21.0.0
* **BREAKING CHANGE:** change capitalization on certain command parameter types (which are no longer case-insensitive since v20.0.0):
  * `userid` → `userId`
  * `channelid` → `channelId`
* Add new command parameter types:
  * `textChannel`
  * `voiceChannel`
  * As with the regular `channel` type, these types are only usable in guilds

# 20.6.1
* Fix bug where command pre-filters were never run if the command didn't also have regular filters

# 20.6.0
* Commands can now have `preFilters` in addition to regular filters. These are run right after permission checks, before
any command argument types or command errors are handled. This makes them ideal for custom permission checks.

# 20.5.0
* Command filter functions are now also passed the plugin instance as a third parameter (plays nicer with typings than just binding in this case)

# 20.4.0
* Command filter functions now have their context (`this`) bound to the plugin instance

# 20.3.2
* Fix bug where mergeConfig could cause unintended deep modifications to the source objects

# 20.3.1
* Abort `loadGuild()` if the bot is not in the guild. This could happen with reloads prior to the fix.

# 20.3.0
* Export `configUtils`

# 20.2.2
* Update Eris peer dependency to `^0.10.1`

# 20.2.1
* Security patches to some dependencies

# 20.2.0
* Add support for category overrides. The override property is called `category` and, like channel overrides, matches if any of the specified categories matches.

# 20.1.0
* Add getInviteLink helper function ([#1](https://github.com/Dragory/Knub/pull/1))

# 20.0.2
* Fix not being able to use `null` for the restrict param of the event decorator

# 20.0.1
* Allow partial members in `Plugin.getMemberLevel`

# 20.0.0
* **BREAKING CHANGE:** Argument type names are no longer case-insensitive

# 19.4.0
* Add new helper functions:
  * `disableLinkPreviews()`
  * `disableCodeBlocks()`
  * `deactivateMentions()`
* When showing command argument type conversion errors, the original error messages thrown from the conversion function
  are now used. Also applies to errors thrown from custom type functions.
* Make error messages for default command argument types more descriptive
* Export `ICommandDefinition` and `IMatchedCommand` from `CommandManager` in `index.ts`

# 19.3.2
* Fix error when adding reactions in `waitForReaction()` if the message is deleted before the reactions are all added

# 19.3.1
* The `waitForReaction()` helper function no longer waits for all reactions to be added before accepting reaction events

# 19.3.0
* There is a new exported function, `getCommandSignature`, that can be used to get a human-readable description of a command/its signature

# 19.2.0
* You can now specify aliases for commands
* Command parameter overloads now also work when using a CommandManager directly, not just with the command decorator

# 19.1.1
* Channel arguments are now only resolved to the current guild's channels (as it was intended)

# 19.1.0
* `Plugin.getMatchingConfig` now supports the same match params as `Plugin.hasPermission` - that is, you can pass a Message or Member and have the user/channel/level/roles be inferred from those

# 19.0.0
* **BREAKING CHANGE:** Plugin options no longer have a permissions property. Instead, permissions are now part of the plugin's config,
  and permission checks via `hasPermission()` / `permission` decorator are wrappers around getting a matching config and checking that the value at the permission's path is `true`.
  * This change was made to simplify complex permissions and to unify the two systems that were, more or less, identical
* Add `sendErrorMessage()` and `sendSuccessMessage()` to Knub and Plugin. These can be used to send unified (formatting-wise) error messages across plugins. The actual functions to send the message can be specified in Knub options with `sendErrorMessageFn` and `sendSuccessMessageFn`.
* Command errors have been improved, and they now also send the command's usage/signature on error

# 18.2.0
* Add support for argument overloads in command options (could be done with multiple commands with the same name previously)

# 18.1.0
* Add support for custom command argument types. They can either be specified globally in Knub options, or per-plugin with the customArgumentTypes property.

# 18.0.7
* Old locks are now garbage collected after they haven't been acquired in 120 seconds

# 18.0.6
* Fix erroneous error message in plugin loading

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
