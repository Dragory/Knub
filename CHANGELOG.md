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
