# 31.0.0
Released: 19 November 2022

**BREAKING CHANGES**
* Knub now uses **discord.js v14**
* Knub now requires **TypeScript 4.9** or higher
* Renamed several helper functions:
  * `typedGuildCommand()` ➔ `guildPluginMessageCommand()`
  * `typedGlobalCommand()` ➔ `globalPluginMessageCommand()`
  * `typedGuildEventListener()` ➔ `guildPluginEventListener()`
  * `typedGlobalEventListener()` ➔ `globalPluginEventListener()`
  * `typedGuildPlugin()` ➔ `guildPlugin()`
  * `typedGlobalPlugin()` ➔ `globalPlugin()`
* Plugin properties `configPreprocessor()` and `configValidator()` have been replaced by `configParser()`
* Message command blueprints now require a `type: "message"` property
  * This is set automatically by the `guildPluginMessageCommand()` / `globalPluginMessageCommand()` helper functions
* Types `BasePluginConfig` and `PartialPluginOptions` have been removed

**New features**
* Slash commands

**Other**
* Knub has a new documentation website: https://knub.zeppelin.gg

# 30.0.0-beta.46
* **BREAKING CHANGE:** `Knub.getPluginPerformanceStats()` has been removed and replaced with a new profiler
* Knub now has a built-in profiler, accessible from `Knub.profiler`
  * By default, the profiler tracks plugin load times, event listeners, and command handlers
  * You can add track custom items by using the `Profiler.addDataPoint()` function
  * You can retrieve accumulated performance stats with `Profiler.getData()`

# 30.0.0-beta.45
* Changed guild loading to be sequential as a test

# 30.0.0-beta.44
* Increase guild load queue timeout
* Add plugin load time performance stats

# 30.0.0-beta.43
* Fix bug where errors during guild loading did not result in the partial guild being unloaded

# 30.0.0-beta.42
* `PluginBlueprint.dependencies` can now also return a Promise

# 30.0.0-beta.41
* **BREAKING CHANGE:** `PluginBlueprint.dependencies` is now a function that returns an array of dependencies
  * This should better accomodate circular dependencies

# 30.0.0-beta.40
* New overrides:
  * `thread` — Match on thread ID
  * `is_thread` — Match on whether a given message is in a thread
* `channel` and `category` overrides now support messages within threads
  * A thread message's `channel` is the thread's parent channel and its `category` is the parent channel's category

# 30.0.0-beta.39
* **BREAKING CHANGE:** Knub now uses discord.js v13 and requires Node v16.6+
* Lots of discord.js fixes from @Dark

# 30.0.0-beta.38
* **BREAKING CHANGE:** As an experiment, this release of Knub uses **discord.js** instead of **Eris**
  * This means many events have different names and objects behave differently. This is *not* a drop-in replacement for beta.37.
  * The specific d.js version used is a PR with support for message components. This will be switched to a pinned master branch release once the PR is merged.
    * Version: `monbrey/discord.js#9c42f571093b2565df28b756fdca4ac59cad0fe3`
  * Many `resolveX` helpers have been removed in favor of d.js's `resolve()` functions on Manager objects
  * `waitForReaction` helper has been removed in favor of using buttons. More helpers for buttons to follow.

# 30.0.0-beta.37
* **BREAKING CHANGE:** Knub now supports and expects Eris ^0.15.1
* **BREAKING CHANGE:** Rename `onLoad` to `afterLoad` and `onUnload` to `afterUnload` for clarity
* **BREAKING CHANGE:** Rename `onBeforeLoad` to `beforeLoad` and `onBeforeUnload` to `beforeUnload` for consistency with the change above
* **BREAKING CHANGE:** `beforeLoad` has new guarantees and limitations:
  * Other plugins haven't yet interacted with this plugin
  * Other plugins can't interact with this plugin during this function
  * For that reason, `PluginData.hasPlugin()` and `PluginData.getPlugin()` are unavailable
* **BREAKING CHANGE:** `afterUnload` has new guarantees and limitations:
  * Other plugins can't interact with this plugin anymore
  * `PluginData.hasPlugin()` and `PluginData.getPlugin()` are unavailable
* **BREAKING CHANGE:** Remove `guildPluginLoaded` and `guildPluginUnloaded` events
  * Guild loads are now considered a single opaque event. Listen to the `guildLoaded` event instead and then find the plugin via Map in`knub.getLoadedGuild().loadedPlugins`.
* Both `GuildPluginData` and `GlobalPluginData` now contain a `loaded` boolean
  * The value is set to `true` after `beforeLoad()` but before `afterLoad()`
  * The value is set to `false` after `beforeUnload()` but before `afterUnload()`
  * Any persistent loops and checks should check this value and interrupt themselves if it's changed to `false`
* In plugins that queue operations or set timeouts/intervals, you should include logic in `beforeUnload` that either interrupts or waits for these operations to finish
* Guild loads and unloads are now properly queued, hopefully resulting in fewer race conditions
* **BREAKING CHANGE:** Rework how custom override criteria are defined and typed.
  * In addition to `customOverrideCriteria`, PluginTypes now also support `customOverrideMatchParams`. This adds types for the `extra` property in `MatchParams`.
  * Instead of a `customOverrideCriteriaMatcher` function, custom override criteria are now defined as a `customOverrideCriteriaFunctions` object.
    This makes it statically analyzable and allows proper type checks.
  * Before:
    ```ts
    {
      // ...other plugin properties...
      customOverrideCriteriaMatcher: (pluginData, criteria, matchParams) => {
        if (criteria.targetUserId && matchParams.extra.targetUserId !== criteria.targetUserId) return false;
        if (criteria.targetChannelId && matchParams.extra.targetChannelId !== criteria.targetChannelId) return false;
        return true;
      }
    }
    ```

    After:
    ```ts
    {
      // ...other plugin properties...
      customOverrideCriteriaFunctions: {
        // `matchParams.extra` has types from the `PluginType.customOverrideMatchParams`
        // `value` has its type from the matching property in `PluginType.customOverrideCriteria`
        targetUserId: (pluginData, matchParams, value) => matchParams.extra.targetUserId === value,
        targetChannelId: (pluginData, matchParams, value) => matchParams.extra.targetChannelId === value
      }
    }
    ```
* **BREAKING CHANGE:** Override criteria can now be resolved asynchronously.
  * This means that all calls to `PluginData.config.get*` (`PluginConfigManager.get*`) now return promises,
    except plain `PluginData.config.get()` which does no override matching.
  * Custom override criteria functions can now also return `Promise<boolean>` in addition to `boolean`
* Fix bug in `CooldownManager` that caused `getCooldownRemaining()` to always return 0 ([#7](https://github.com/Dragory/Knub/pull/7))
* Remove `GuildMessage` helper type. Use `Message<GuildTextableChannel>` instead.

# 30.0.0-beta.36
* **BREAKING CHANGE:** Remove all other plugin, event, and command helper function signatures except `(signature)` and the type-helper no-argument signature
  * In other words, **the following signatures have been removed:**
    * `guildPlugin(name, blueprint)` / `globalPlugin(name, blueprint)`
    * `guildEventListener(event, listener)` / `globalEventListener(event, listener)`
    * `guildEventListener(event, options, listener)` / `globalEventListener(event, options, listener)`
    * `guildCommand(trigger, run)` / `globalCommand(trigger, run)`
    * `guildCommand(trigger, signature, run)` / `globalCommand(trigger, signature, run)`
    * `guildCommand(trigger, signature, options, run)` / `globalCommand(trigger, signature, options, run)`
  * **The following signatures remain:**
    * `guildPlugin(blueprint)` / `globalPlugin(blueprint)`
    * `guildPlugin<TPluginType>()(blueprint)` / `globalPlugin<TPluginType>()(blueprint)`
    * `guildEventListener(blueprint)` / `globalEventListener(blueprint)`
    * `guildEventListener<TPluginType>()(blueprint)` / `globalEventListener<TPluginType>()(blueprint)`
    * `guildCommand(blueprint)` / `globalCommand(blueprint)`
    * `guildCommand<TPluginType>()(blueprint)` / `globalCommand<TPluginType>()(blueprint)`
  * This change was done to narrow these helper functions' role to purely a *type* helper, and make the relationship between the blueprint objects and these helper functions clearer
* **BREAKING CHANGE:** Rename plugin, event, and command helper functions to clarify their new, narrower role
  * `guildPlugin()` ➔ `typedGuildPlugin()`
  * `globalPlugin()` ➔ `typedGlobalPlugin()`
  * `guildEventListener()` ➔ `typedGuildEventListener()`
  * `globalEventListener()` ➔ `typedGlobalEventListener()`
  * `guildCommand()` ➔ `typedGuildCommand()`
  * `globalCommand()` ➔ `typedGlobalCommand()`
* **BREAKING CHANGE:** Rename `baseTypeHelpers` to `baseCommandParameterTypeHelpers` to clarify their use

# 30.0.0-beta.35
* Fix permission level 0 not matching in config level overrides

# 30.0.0-beta.34
* Add `chunkLength` parameter to `splitMessageIntoChunks()` helper function

# 30.0.0-beta.33
* Fix `args` type inference for command blueprints where multiple signatures had non-overlapping properties

# 30.0.0-beta.32
* New `onBeforeUnload` hook for plugins. This is called before the context's plugins are unloaded.

# 30.0.0-beta.31
* **BREAKING CHANGE:** Functions for loading/unloading/reloading individual plugins are now private to the Knub class
  * This means that you can only load, unload, or reload an entire context (guild or all global plugins) at once
  * This was done to give plugins guarantees about load order and when their dependencies are available and in what state
* New `onAfterLoad` hook for plugins. This is called after all of the context's plugins have loaded.
* Fix `onUnload` hook not being called for global plugins

# 30.0.0-beta.30
* Allow null for `PluginOverrideCriteria` properties

# 30.0.0-beta.29
* The type hint for guild command messages now properly asserts that
  the message is from a guild, and thus always has a member and its
  channel is always a textable guild channel.

# 30.0.0-beta.28
* Knub is now compiled with TypeScript strict mode
  * This has resulted in some typing tweaks/changes

# 30.0.0-beta.27
* Update peer dependency to Eris ^0.14.0

# 30.0.0-beta.26
* Update `messageReactionAdd` and `messageReactionRemove` event arguments

# 30.0.0-beta.25
* Fixed global plugins attempting to load before the bot user was available

# 30.0.0-beta.24
* Improve start-up handling to be able to load guilds earlier
* Guilds are now automatically loaded when the bot initially joins the guilds

# 30.0.0-beta.23
* **BREAKING CHANGE:** Fix `guildCommand()` and `globalCommand()` requiring a full PluginData type instead of just a
  PluginType type. The functions now only require a PluginType, which makes them consistent with other helpers in Knub.
* Small other type fixes

# 30.0.0-beta.22
* **BREAKING CHANGE:** Better type-safety between guild plugins and global plugins
  * `plugin()` => `guildPlugin()`, `globalPlugin()`
  * `eventListener()` => `guildEventListener()`, `globalEventListener()`
  * `command()` => `guildCommand()`, `globalCommand()`
  * `PluginEventManager` => `GuildPluginEventManager`, `GlobalPluginEventManager`
  * `Knub#loadPlugin()` => `Knub#loadGuildPlugin()`, `Knub#loadGlobalPlugin()`
  * `Knub#unloadPlugin()` => `Knub#unloadGuildPlugin()`, `Knub#unloadGlobalPlugin()`
  * `Knub#reloadPlugin()` => `Knub#reloadGuildPlugin()`, `Knub#reloadGlobalPlugin()`
  * `PluginData` => `GuildPluginData`, `GlobalPluginData`
  * `PluginData.guildConfig` => `GuildPluginData.fullConfig`
  * `PluginData.globalConfig` => `GlobalPluginData.fullConfig`
* Event handling performance improvements by centralizing guild/global event filtering/passing in an `EventRelay` object
  * Event arguments are now only converted to Knub's object representation once
  * Event guild is now also only checked once
  * Guild events are now only passed to the `GuildPluginEventManager` objects of the plugins of the matching guild
  * Global events are now only passed to the `GlobalPluginEventManager` objects of global plugins
    * This should especially improve performance with presence events, which are often global (e.g. `userUpdate`)

# 30.0.0-beta.21
* Update `knub-command-manager` to `v8.1.2`, fixing error messages on invalid option values

# 30.0.0-beta.20
* Fix the "ready" event listener adding multiple instances of guildAvailable listeners, causing
  some servers to load multiple times (more pronounced with an async canLoadGuild() function).
* Add some additional checks to make sure servers don't load twice

# 30.0.0-beta.19
* If plugin loading fails, unload the entire guild and re-throw the error

# 30.0.0-beta.18
* Disable implicit guild restriction on events for global plugins

# 30.0.0-beta.17
* **BREAKING CHANGE:** Removed exclusion modifiers from override values in favor of logical operator criteria.
  * For example, instead of this:
    ```yml
    overrides:
      - channel: "!1234"
        config: ...
    ```
    ...use:
    ```
    overrides:
      - not:
          channel: "!1234"
        config: ...
    ```

# 30.0.0-beta.16
* Fix crash when `typingStart` channel is `undefined`

# 30.0.0-beta.15
* Fix `PluginConfigManager.getMatchingConfig()` breaking if Member doesn't have guild property

# 30.0.0-beta.14
* Fix plugin public interface functions getting the *calling* Plugin's `PluginData`, not their own

# 30.0.0-beta.13
* Fix command argument type inference for rest parameters not being an array

# 30.0.0-beta.12
* Fix type inference for public interfaces of plugin blueprints created with the `plugin()` helper
  when using `pluginData.getPlugin()`

# 30.0.0-beta.11
* **BREAKING CHANGE:** Removed `PluginClass`. Use `PluginBlueprint` (via `plugin()` helper) instead.
* **BREAKING CHANGE:** Removed `logger`.
  * The logFn option still exists and is used internally, but Knub does not export a generic log function anymore;
    that is left to the application.
* **BREAKING CHANGE:** `CommandBlueprint` now always requires `permission` to be set.
  Set to `null` to make a public command.
* **BREAKING CHANGE:** Plugins loaded only as dependencies no longer register their commands or events.
  These plugins have a new property `loadedAsDependency` set to `true` in `pluginData`.
* Transitive dependencies are now also loaded
* Fix error in getCommandSignature() when command has no signatures
* Trim down the published package size slightly by leaving out test files

# 30.0.0-beta.10
* Removed `exports` from `package.json` until
  [microsoft/TypeScript#33079](https://github.com/microsoft/TypeScript/issues/33079) is fixed

# 30.0.0-beta.9
* Update to `knub-command-manager` v8.1.1 for improved type helper type hints

# 30.0.0-beta.8
* **BREAKING CHANGE:** Combined the `args` and `meta` parameters for event listener functions.
  The `args` object is now at `meta.args`.
  * E.g. `eventListener("messageCreate", ({ args }) => { ... })`
* New `plugin()` signatures:
  * `plugin(blueprint)`
  * `plugin<TPluginType>()(blueprint)`
* New `command()` signatures:
  * `command(blueprint)`
  * `command<TPluginType>()(blueprint)`
* New `eventListener()` signatures:
  * `eventListener(blueprint)`
  * `eventListener<TPluginType>()(blueprint)`
* `CommandBlueprint` now also accepts arrays of triggers
* Export `Plugin` and `LoadedPlugin`

# 30.0.0-beta.7
* Add `string`, `bool`, and `switchOption` from `knub-command-manager` to `baseTypeHelpers`
* Update TypeScript compilation target to `ES2020` for Node.js 14

# 30.0.0-beta.6
* **BREAKING CHANGE:** Combined the `args` and `meta` parameters for command functions.
  The `args` object is now at `meta.args`.
  * E.g. `command("foo", ({ args }) => { ... })`
* **BREAKING CHANGE:** Updated `plugin()` helper signature for clarity and better type inference:
  * `plugin(name, blueprint)`
  * `plugin<TPluginType>()(name, blueprint)`
* Updated `command()` helper signature for clarity and better type inference:
  * `command(trigger, run)`
  * `command(trigger, signature, run)`
  * `command(trigger, signature, options, run)`
  * `command<TPluginType>()(trigger, run)`
  * `command<TPluginType>()(trigger, signature, run)`
  * `command<TPluginType>()(trigger, signature, options, run)`
* Updated `eventListener()` helper signature for clarity and better type inference:
  * `eventListener(event, listener)`
  * `eventListener(event, options, listener)`
  * `eventListener<TPluginType>()(event, listener)`
  * `eventListener<TPluginType>()(event, options, listener)`
* `EventListenerBlueprint` now extends `OnOpts` rather than having a separate `opts` property for `OnOpts`
* Add `PluginData#state` and `BasePluginType#state` to allow plugins to keep plugin-instance-specific state
  and easily pass it around

# 30.0.0-beta.5
* Export `PluginData` interface
* Add plugin helper function: `helpers.getMemberLevel()`

# 30.0.0-beta.4
* Use block comments for `PluginClass` and `PluginBlueprint` properties so they're retained in compiled files

# 30.0.0-beta.3
* **BREAKING CHANGE:** Default overrides for a plugin now come *before* overrides defined in the config
  when evaluating overrides
  * This behavior feels more intuitive than the previous one, since you'd expect to be "extending" the default
    overrides, not prepending your own overrides to them
* Added support for config preprocessors and validators
  * `PluginBlueprint.configPreprocessor`, `PluginBlueprint.configValidator`
  * `PluginClass.configPreprocessor` (static), `PluginClass.configValidator` (static)

# 30.0.0-beta.2
* Updated peer dependency of Eris to 0.13.3
* Updated target Node.js version to 14
* Updated several dependencies and made required changes to the code on Knub's end

# 30.0.0-beta.1
* Updated peer dependency of Eris to 0.13.2
* Updated to `knub-command-manager` v8
  * Signature strings (for parameters) are no longer parsed implicitly, and it is recommended
    to specify them as an object using the new parameter helpers instead. If you'd prefer to use
    a string instead, you can parse it with the exported `parseSignature()` helper function.
  * Options are no longer specified as command options, but as part of the command's signature
* Replaced `asCommand()` helper from beta.0 with `command()` with better type inference
* Replaced `asEvent()` helper from beta.0 with `event()` with better type inference
* Replaced `asPlugin()` helper from beta.0 with `plugin()` for consistency with the above
* Interfaces `PluginOptions`, `PartialPluginOptions`, and `BaseConfig` now always require specifying the type for `TPluginType`

# 30.0.0-beta.0
* Knub now uses Eris 0.13
* The `Plugin` class is now called `PluginClass`
* Deprecated the `GlobalPlugin` class. Use `PluginClass` instead.
* `PluginClass` constructor now takes a `PluginData` object as its only
  argument (see below for more details)
* Most plugin functionality has been moved to separate "manager" objects:
  `PluginCommandManager`, `PluginEventManager`, etc.
  These can be accessed through the `PluginData` object (see below).
* New: **PluginBlueprint**
    * An alternative, static way of defining plugins without using classes
    * Makes it easier to split large plugins into smaller chunks
* New: **EventListenerBlueprint**
    * A static way of defining event listeners
    * Works with both PluginClass and PluginBlueprint
* New: **CommandBlueprint**
    * A static way of defining a command
    * Works with both PluginClass and PluginBlueprint
* New: **PluginData** object
    * A plugin instance specific object with several utilities, such as event
      and command managers. Most plugin functionality has been moved to
      PluginData. This object is passed to each plugin and is also available in
      event filters, command filters, event listeners, and command handlers.
* Changes to `KnubArgs` (the object passed to Knub constructor):
    * Renamed `plugins` to `guildPlugins`
    * `options.getEnabledPlugins` is now called `options.getEnabledGuildPlugins`
        * Signature: `(ctx, pluginMap) => Awaitable<string[]>`
* Deprecated PluginClass fields:
	* `PluginClass.getDefaultOptions()` — Now a static property `PluginClass.defaultOptions`
	* `PluginClass.getConfig()` — Use `this.config.get()` instead
	* `PluginClass.getMatchingConfig()` — Use `this.config.getMatchingConfig()` instead
	* `PluginClass.getConfigForMsg()` — Use `this.config.getForMsg()` instead
	* `PluginClass.getConfigForChannel()` — Use `this.config.getForChannel()` instead
	* `PluginClass.getConfigForUser()` — Use `this.config.getForUser()` instead
	* `PluginClass.getConfigForMember()` — Use `this.config.getForMember()` instead
	* `PluginClass.hasPermission()` — Use `pluginUtils.hasPermission()` instead
	* `PluginClass.addCommand()` — Use `this.commands.add()` instead
	* `PluginClass.removeCommand()` — Use `this.commands.remove()` instead
	* `PluginClass.on()` — Use `this.events.on()` instead
	* `PluginClass.off()` — Use `this.events.off()` instead
	* `PluginClass.clearEventHandlers()` — Use `this.events.clearAllListeners()` instead
	* `PluginClass.matchCustomOverrideCriteria()` — Now a static property `PluginClass.customOverrideMatcher` with
	  an updated signature
	* `PluginClass.runtimePluginName` — Always the same as `PluginClass.pluginName` now
	* `PluginClass.bot` — now called `PluginClass.client`
	* `PluginClass.knub` — use `this.pluginData.getKnubInstance()` instead
* New static plugin fields:
	* `commands` — array of command blueprints to register when Knub loads the
	  plugin
	* `events` — array of event listener blueprints to register when Knub loads
	  the plugin
	* `defaultOptions` — default options (config + overrides) for the plugin
	* `customOverrideMatcher` — Matcher function for custom overrides, if used
* Functions and interfaces that previously took `TConfig` and `TCustomOverrideCriteria` now take a `TPluginType` type
  instead. This is an interface that includes equivalents for `TConfig` and `TCustomOverrideCriteria` and is used
  throughout Knub to pass plugin types.
* Command `config.extra` no longer contains `requiredPermission`, `cooldown`, etc. directly.
  Instead, `config.extra` now contains the original blueprint used to create the command (`config.extra.blueprint`),
  which in turn contains the values that were previously in `config.extra`.
  There should rarely be a need to touch these values directly.
* `command()` and `event()` decorators no longer save their data in class metadata,
  but in the static commands/events arrays instead
* Renamed `Knub.getGuildData()` to `Knub.getLoadedGuild()`

# 29.0.1
* Fix override conditions resolving to `true` even when unknown conditions were
  present. Such overrides will now always resolve to `false`.

# 29.0.0
* **BREAKING CHANGE:** Knub's constructor now takes an *optional* `TGuildConfig`
  type argument that specifies the type of guild configuration (must extend
  `IGuildConfig`). Defaults to `IGuildConfig`. This type argument is also used
  in `IGuildData` and `IOptions`, where it is *required*. These two types were
  not exported from `index.ts`, but were still accessible if importing from
  `Knub.ts` directly, so I'm marking this as a breaking change.
* Knub's constructor now takes an *optional* `TGlobalConfig` type argument that
  specifies the type of the global configuration (must extend `IGlobalConfig`).
  Defaults to `IGlobalConfig`.
* **BREAKING CHANGE:** `IGuildConfig` and `IGlobalConfig` no longer allow
  arbitrary extra properties. You should specify your own types in Knub's
  constructor instead (where you can also add back support for arbitrary
  properties if you want).
* `IGuildData` and `IOptions` are now exported from `index.ts`

# 28.0.0
* **BREAKING CHANGE:** Errors in plugins are now only re-thrown as `PluginError`
  in **production mode** (i.e. NODE_ENV=production). Before, this happened
  regardless of NODE_ENV.
  * This change was made because catching and then re-throwing the error caused
    issues with debuggers. Specifically, the call stack when pausing on the
    re-thrown error would not match that of the original error, presumably
    because Promise.catch() is handled separately.

# 27.0.0
* **BREAKING CHANGE:** Update `knub-command-manager` to v7.0.0
  * This update adds support for escaping characters in commands with a
    backslash. This means that backslashes are effectively ignored in argument
    parsing unless also escaped.

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
