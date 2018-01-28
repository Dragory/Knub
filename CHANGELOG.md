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
