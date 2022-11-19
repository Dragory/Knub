import { assert, expect } from "chai";
import { PluginConfigManager } from "./PluginConfigManager";
import {
  createMockClient,
  createMockGuild,
  createMockMember,
  createMockMessage,
  createMockRole,
  createMockTextChannel,
  createMockThread,
  createMockUser,
  sleep,
} from "../testUtils";
import { BasePluginType } from "../plugins/pluginTypes";
import { GuildPluginData } from "../plugins/PluginData";
import { z } from "zod";

describe("PluginConfigManager", () => {
  it("merge user config with default config", async () => {
    interface PluginType extends BasePluginType {
      config: {
        can_do: boolean;
        nested: {
          one: number;
          two: number;
        };
      };
    }

    const configManager = new PluginConfigManager<PluginType>(
      {
        config: {
          can_do: false,
          nested: {
            one: 10,
            two: 20,
          },
        },
      },
      {
        config: {
          can_do: true,
          nested: {
            two: 30,
          },
        },
      },
      {
        levels: {},
        parser: input => input as PluginType["config"],
      },
    );
    await configManager.init();

    expect(configManager.get().can_do).to.equal(true);
    expect(configManager.get().nested.one).to.equal(10);
    expect(configManager.get().nested.two).to.equal(30);
  });

  it("merge user overrides with default overrides", async () => {
    interface PluginType extends BasePluginType {
      config: {
        can_do: boolean;
      };
    }

    const configManager = new PluginConfigManager<PluginType>(
      {
        config: {
          can_do: false,
        },
        overrides: [
          {
            level: ">=50",
            config: {
              can_do: true,
            },
          },
        ],
      },
      {
        overrides: [
          {
            level: ">=20",
            config: {
              can_do: true,
            },
          },
          {
            level: ">=40",
            config: {
              can_do: false,
            },
          },
        ],
      },
      {
        levels: {},
        parser: input => input as PluginType["config"],
      },
    );
    await configManager.init();

    expect(configManager.get().can_do).to.equal(false);
    expect((await configManager.getMatchingConfig({ level: 20 })).can_do).to.equal(true);
    expect((await configManager.getMatchingConfig({ level: 40 })).can_do).to.equal(false);
    expect((await configManager.getMatchingConfig({ level: 50 })).can_do).to.equal(false);
  });

  it("replace default overrides", async () => {
    interface PluginType extends BasePluginType {
      config: {
        can_do: boolean;
      };
    }

    const configManager = new PluginConfigManager<PluginType>(
      {
        config: {
          can_do: false,
        },
        overrides: [
          {
            level: ">=50",
            config: {
              can_do: true,
            },
          },
        ],
      },
      {
        replaceDefaultOverrides: true,
        overrides: [
          {
            level: ">=100",
            config: {
              can_do: true,
            },
          },
        ],
      },
      {
        levels: {},
        parser: input => input as PluginType["config"],
      },
    );
    await configManager.init();

    expect(configManager.get().can_do).to.equal(false);
    expect((await configManager.getMatchingConfig({ level: 50 })).can_do).to.equal(false);
    expect((await configManager.getMatchingConfig({ level: 100 })).can_do).to.equal(true);
  });

  it("Config parser", async () => {
    const configSchema = z.object({
      something: z.number(),
    });
    type ConfigSchema = z.TypeOf<typeof configSchema>;

    interface PluginType extends BasePluginType {
      config: ConfigSchema;
    }

    const configManager = new PluginConfigManager<PluginType>(
      {
        config: {
          something: 0,
        },
      },
      {
        config: {
          something: "not a number",
        },
      },
      {
        levels: {},
        parser: (input) => configSchema.parse(input),
      },
    );

    try {
      await configManager.init();
    } catch (err) {
      return;
    }

    assert.fail("Config parser did not throw an error");
  });

  it("Config parser mutations", async () => {
    interface PluginType extends BasePluginType {
      config: {
        something: number;
      };
    }

    const configManager = new PluginConfigManager<PluginType>(
      {
        config: {
          something: 0,
        },
      },
      {
        config: {
          someThing: 5,
        },
      },
      {
        levels: {},
        parser: () => {
          return {
            something: 7,
          };
        },
      },
    );
    await configManager.init();

    expect(configManager.get().something).to.equal(7);
  });

  it("Async config parser", async () => {
    interface PluginType extends BasePluginType {
      config: {
        something: number;
      };
    }

    const configManager = new PluginConfigManager<PluginType>(
      {
        config: {
          something: 0,
        },
      },
      {
        config: {
          someThing: 5,
        },
      },
      {
        levels: {},
        parser: async () => {
          await sleep(1);
          return {
            something: 7,
          };
        },
      },
    );
    await configManager.init();

    expect(configManager.get().something).to.equal(7);
  });

  it("getMatchingConfig(): user", async () => {
    interface PluginType extends BasePluginType {
      config: {
        works: boolean;
      };
    }

    const client = createMockClient();
    const guild = createMockGuild(client);
    const user = createMockUser(client);
    const member = createMockMember(guild, user);
    const channel = createMockTextChannel(client, guild.id);
    const message = createMockMessage(client, channel, user);

    const configManager = new PluginConfigManager<PluginType>(
      {
        config: {
          works: false,
        },
        overrides: [
          {
            user: user.id,
            config: {
              works: true,
            },
          },
        ],
      },
      {},
      {
        levels: {},
        parser: (input) => input as PluginType["config"],
      },
    );
    configManager.setPluginData({ context: "guild", guild } as GuildPluginData<any>);
    await configManager.init();

    expect(configManager.get().works).to.equal(false);
    expect((await configManager.getMatchingConfig({ userId: user.id })).works).to.equal(true);
    expect((await configManager.getMatchingConfig({ member })).works).to.equal(true);
    expect((await configManager.getMatchingConfig({ message })).works).to.equal(true);
  });

  it("getMatchingConfig(): channel", async () => {
    interface PluginType extends BasePluginType {
      config: {
        works: boolean;
      };
    }

    const client = createMockClient();
    const guild = createMockGuild(client);
    const user = createMockUser(client);
    const channel = createMockTextChannel(client, guild.id);
    const message = createMockMessage(client, channel, user);

    const configManager = new PluginConfigManager<PluginType>(
      {
        config: {
          works: false,
        },
        overrides: [
          {
            channel: channel.id,
            config: {
              works: true,
            },
          },
        ],
      },
      {},
      {
        levels: {},
        parser: (input) => input as PluginType["config"],
      },
    );
    await configManager.init();

    expect(configManager.get().works).to.equal(false);
    expect((await configManager.getMatchingConfig({ channelId: channel.id })).works).to.equal(true);
    expect((await configManager.getMatchingConfig({ message })).works).to.equal(true);
  });

  it("getMatchingConfig(): channel of thread message", async () => {
    interface PluginType extends BasePluginType {
      config: {
        works: boolean;
      };
    }

    const client = createMockClient();
    const guild = createMockGuild(client);
    const user = createMockUser(client);
    const channel = createMockTextChannel(client, guild.id);
    const thread = createMockThread(channel);
    const message = createMockMessage(client, thread, user);

    const configManager = new PluginConfigManager<PluginType>(
      {
        config: {
          works: false,
        },
        overrides: [
          {
            channel: channel.id,
            config: {
              works: true,
            },
          },
        ],
      },
      {},
      {
        levels: {},
        parser: (input) => input as PluginType["config"],
      },
    );
    await configManager.init();

    expect(configManager.get().works).to.equal(false);
    expect((await configManager.getMatchingConfig({ message })).works).to.equal(true);
  });

  it("getMatchingConfig(): category", async () => {
    interface PluginType extends BasePluginType {
      config: {
        works: boolean;
      };
    }

    const categoryId = "12345";
    const client = createMockClient();
    const guild = createMockGuild(client);
    const user = createMockUser(client);
    const channel = createMockTextChannel(client, guild.id, { parent_id: categoryId });
    const message = createMockMessage(client, channel, user);

    const configManager = new PluginConfigManager<PluginType>(
      {
        config: {
          works: false,
        },
        overrides: [
          {
            category: categoryId,
            config: {
              works: true,
            },
          },
        ],
      },
      {},
      {
        levels: {},
        parser: (input) => input as PluginType["config"],
      },
    );
    await configManager.init();

    expect(configManager.get().works).to.equal(false);
    expect((await configManager.getMatchingConfig({ categoryId })).works).to.equal(true);
    expect((await configManager.getMatchingConfig({ message })).works).to.equal(true);
  });

  it("getMatchingConfig(): category of thread message", async () => {
    interface PluginType extends BasePluginType {
      config: {
        works: boolean;
      };
    }

    const categoryId = "12345";
    const client = createMockClient();
    const guild = createMockGuild(client);
    const user = createMockUser(client);
    const channel = createMockTextChannel(client, guild.id, { parent_id: categoryId });
    const thread = createMockThread(channel);
    const message = createMockMessage(client, thread, user);

    const configManager = new PluginConfigManager<PluginType>(
      {
        config: {
          works: false,
        },
        overrides: [
          {
            category: categoryId,
            config: {
              works: true,
            },
          },
        ],
      },
      {},
      {
        levels: {},
        parser: (input) => input as PluginType["config"],
      },
    );
    await configManager.init();

    expect(configManager.get().works).to.equal(false);
    expect((await configManager.getMatchingConfig({ message })).works).to.equal(true);
  });

  it("getMatchingConfig(): thread", async () => {
    interface PluginType extends BasePluginType {
      config: {
        works: boolean;
      };
    }

    const client = createMockClient();
    const guild = createMockGuild(client);
    const user = createMockUser(client);
    const channel = createMockTextChannel(client, guild.id);
    const thread = createMockThread(channel);
    const message = createMockMessage(client, thread, user);

    const configManager = new PluginConfigManager<PluginType>(
      {
        config: {
          works: false,
        },
        overrides: [
          {
            thread: thread.id,
            config: {
              works: true,
            },
          },
        ],
      },
      {},
      {
        levels: {},
        parser: (input) => input as PluginType["config"],
      },
    );
    await configManager.init();

    expect(configManager.get().works).to.equal(false);
    expect((await configManager.getMatchingConfig({ message })).works).to.equal(true);
  });

  it("getMatchingConfig(): is_thread", async () => {
    interface PluginType extends BasePluginType {
      config: {
        works: boolean;
      };
    }

    const client = createMockClient();
    const guild = createMockGuild(client);
    const user = createMockUser(client);
    const channel = createMockTextChannel(client, guild.id);
    const thread = createMockThread(channel);
    const message = createMockMessage(client, thread, user);

    const configManager = new PluginConfigManager<PluginType>(
      {
        config: {
          works: false,
        },
        overrides: [
          {
            is_thread: true,
            config: {
              works: true,
            },
          },
        ],
      },
      {},
      {
        levels: {},
        parser: (input) => input as PluginType["config"],
      },
    );
    await configManager.init();

    expect(configManager.get().works).to.equal(false);
    expect((await configManager.getMatchingConfig({ message })).works).to.equal(true);
  });

  it("getMatchingConfig(): roles", async () => {
    interface PluginType extends BasePluginType {
      config: {
        works: boolean;
      };
    }

    const client = createMockClient();
    const guild = createMockGuild(client);
    const user = createMockUser(client);
    const role = createMockRole(guild);
    const member = createMockMember(guild, user, { roles: [role.id] });
    const channel = createMockTextChannel(client, guild.id);
    const message = createMockMessage(client, channel, user);

    const configManager = new PluginConfigManager<PluginType>(
      {
        config: {
          works: false,
        },
        overrides: [
          {
            role: role.id,
            config: {
              works: true,
            },
          },
        ],
      },
      {},
      {
        levels: {},
        parser: (input) => input as PluginType["config"],
      },
    );
    configManager.setPluginData({ context: "guild", guild } as GuildPluginData<any>);
    await configManager.init();

    expect(configManager.get().works).to.equal(false);
    expect((await configManager.getMatchingConfig({ memberRoles: [role.id] })).works).to.equal(true);
    expect((await configManager.getMatchingConfig({ member })).works).to.equal(true);
    expect((await configManager.getMatchingConfig({ message })).works).to.equal(true);
  });
});
