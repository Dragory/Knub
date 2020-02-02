# Knub
Knub is a JavaScript/TypeScript framework for creating Discord bots.

## High-level overview
Knub, at its heart, is a plugin loader.
For each **plugin context**, it will create a new instance of each **plugin**
that should be loaded for the context. A *plugin context* is usually just one
Discord server ("guild"), but it could also be a group of servers.

A *plugin* can be one of the following:
* A plugin manifest that specifies details about the plugin
* A class, optionally extending the base Plugin class
* A simple function

Each plugin has access to a set of utility modules for setting up commands,
event listeners, user configuration, etc. Plugins are also able to specify
public interfaces that other plugins can use for interoperability, as well as
plugin dependencies.

The primary goals for Knub are **safety** (plugin instances are restricted to
their plugin context unless deliberately opted out), **predictability** (any
"magic" within Knub should be easy to reason about, and ideally the magic is
left out in the first place), and **extensive built-in functionality** for
common bot requirements.
