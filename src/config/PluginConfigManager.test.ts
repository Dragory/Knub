import { assert, expect } from "chai";
import { describe, it } from "mocha";
import { z } from "zod/v4";
import type { BasePluginData, GuildPluginData } from "../plugins/PluginData.ts";
import type { BasePluginType } from "../plugins/pluginTypes.ts";
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
} from "../testUtils.ts";
import { PluginConfigManager } from "./PluginConfigManager.ts";

describe("PluginConfigManager", () => {
  it("merge user config with default config", async () => {
    const configSchema = z.strictObject({
      can_do: z.boolean().default(false),
      nested: z.strictObject({
        one: z.number().default(10),
        two: z.number().default(20),
      }),
    });
    interface PluginType extends BasePluginType {
      configSchema: typeof configSchema;
    }

    const configManager = new PluginConfigManager<GuildPluginData<PluginType>>(
      {
        config: {
          can_do: true,
          nested: {
            two: 30,
          },
        },
      },
      {
        configSchema,
        defaultOverrides: [],
        levels: {},
      },
    );
    await configManager.init();

    expect((await configManager.get()).can_do).to.equal(true);
    expect((await configManager.get()).nested.one).to.equal(10);
    expect((await configManager.get()).nested.two).to.equal(30);
  });

  it("merge user overrides with default overrides", async () => {
    const configSchema = z.strictObject({
      can_do: z.boolean().default(false),
    });
    interface PluginType extends BasePluginType {
      configSchema: typeof configSchema;
    }

    const configManager = new PluginConfigManager<BasePluginData<PluginType>>(
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
        configSchema,
        defaultOverrides: [
          {
            level: ">=50",
            config: {
              can_do: true,
            },
          },
        ],
        levels: {},
      },
    );
    await configManager.init();

    expect((await configManager.get()).can_do).to.equal(false);
    expect((await configManager.getMatchingConfig({ level: 20 })).can_do).to.equal(true);
    expect((await configManager.getMatchingConfig({ level: 40 })).can_do).to.equal(false);
    expect((await configManager.getMatchingConfig({ level: 50 })).can_do).to.equal(false);
  });

  it("replace default overrides", async () => {
    const configSchema = z.strictObject({
      can_do: z.boolean().default(false),
    });
    interface PluginType extends BasePluginType {
      configSchema: typeof configSchema;
    }

    const configManager = new PluginConfigManager<BasePluginData<PluginType>>(
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
        configSchema,
        defaultOverrides: [
          {
            level: ">=50",
            config: {
              can_do: true,
            },
          },
        ],
        levels: {},
      },
    );
    await configManager.init();

    expect((await configManager.get()).can_do).to.equal(false);
    expect((await configManager.getMatchingConfig({ level: 50 })).can_do).to.equal(false);
    expect((await configManager.getMatchingConfig({ level: 100 })).can_do).to.equal(true);
  });

  it("Config schema", async () => {
    const configSchema = z.strictObject({
      something: z.number().default(0),
    });
    interface PluginType extends BasePluginType {
      config: typeof configSchema;
    }

    const configManager = new PluginConfigManager<BasePluginData<PluginType>>(
      {
        config: {
          something: "not a number",
        },
      },
      {
        configSchema,
        defaultOverrides: [],
        levels: {},
      },
    );

    try {
      await configManager.init();
    } catch (err) {
      return;
    }

    assert.fail("Config schema parsing did not throw an error");
  });

  it("Async config schema", async () => {
    const configSchema = z.strictObject({
      something: z
        .string()
        .default("0")
        .transform(async (val) => {
          await sleep(1);
          return Number.parseInt(val, 10);
        }),
    });
    interface PluginType extends BasePluginType {
      configSchema: typeof configSchema;
    }

    const configManager = new PluginConfigManager<BasePluginData<PluginType>>(
      {
        config: {
          something: "7",
        },
      },
      {
        configSchema,
        defaultOverrides: [],
        levels: {},
      },
    );
    await configManager.init();

    expect((await configManager.get()).something).to.equal(7);
  });

  it("getMatchingConfig(): user", async () => {
    const configSchema = z.strictObject({
      works: z.boolean().default(false),
    });
    interface PluginType extends BasePluginType {
      configSchema: typeof configSchema;
    }

    const client = createMockClient();
    const guild = createMockGuild(client);
    const user = createMockUser(client);
    const member = createMockMember(guild, user);
    const channel = createMockTextChannel(client, guild.id);
    const message = createMockMessage(client, channel, user);

    const configManager = new PluginConfigManager<BasePluginData<PluginType>>(
      {},
      {
        configSchema,
        defaultOverrides: [
          {
            user: user.id,
            config: {
              works: true,
            },
          },
        ],
        levels: {},
      },
    );
    configManager.setPluginData({ context: "guild", guild } as GuildPluginData<any>);
    await configManager.init();

    expect((await configManager.get()).works).to.equal(false);
    expect((await configManager.getMatchingConfig({ userId: user.id })).works).to.equal(true);
    expect((await configManager.getMatchingConfig({ member })).works).to.equal(true);
    expect((await configManager.getMatchingConfig({ message })).works).to.equal(true);
  });

  it("getMatchingConfig(): channel", async () => {
    const configSchema = z.strictObject({
      works: z.boolean().default(false),
    });
    interface PluginType extends BasePluginType {
      configSchema: typeof configSchema;
    }

    const client = createMockClient();
    const guild = createMockGuild(client);
    const user = createMockUser(client);
    const channel = createMockTextChannel(client, guild.id);
    const message = createMockMessage(client, channel, user);

    const configManager = new PluginConfigManager<BasePluginData<PluginType>>(
      {},
      {
        configSchema,
        defaultOverrides: [
          {
            channel: channel.id,
            config: {
              works: true,
            },
          },
        ],
        levels: {},
      },
    );
    await configManager.init();

    expect((await configManager.get()).works).to.equal(false);
    expect((await configManager.getMatchingConfig({ channelId: channel.id })).works).to.equal(true);
    expect((await configManager.getMatchingConfig({ message })).works).to.equal(true);
  });

  it("getMatchingConfig(): channel of thread message", async () => {
    const configSchema = z.strictObject({
      works: z.boolean().default(false),
    });
    interface PluginType extends BasePluginType {
      configSchema: typeof configSchema;
    }

    const client = createMockClient();
    const guild = createMockGuild(client);
    const user = createMockUser(client);
    const channel = createMockTextChannel(client, guild.id);
    const thread = createMockThread(channel);
    const message = createMockMessage(client, thread, user);

    const configManager = new PluginConfigManager<BasePluginData<PluginType>>(
      {},
      {
        configSchema,
        defaultOverrides: [
          {
            channel: channel.id,
            config: {
              works: true,
            },
          },
        ],
        levels: {},
      },
    );
    await configManager.init();

    expect((await configManager.get()).works).to.equal(false);
    expect((await configManager.getMatchingConfig({ message })).works).to.equal(true);
  });

  it("getMatchingConfig(): category", async () => {
    const configSchema = z.strictObject({
      works: z.boolean().default(false),
    });
    interface PluginType extends BasePluginType {
      configSchema: typeof configSchema;
    }

    const categoryId = "12345";
    const client = createMockClient();
    const guild = createMockGuild(client);
    const user = createMockUser(client);
    const channel = createMockTextChannel(client, guild.id, { parent_id: categoryId });
    const message = createMockMessage(client, channel, user);

    const configManager = new PluginConfigManager<BasePluginData<PluginType>>(
      {},
      {
        configSchema,
        defaultOverrides: [
          {
            category: categoryId,
            config: {
              works: true,
            },
          },
        ],
        levels: {},
      },
    );
    await configManager.init();

    expect((await configManager.get()).works).to.equal(false);
    expect((await configManager.getMatchingConfig({ categoryId })).works).to.equal(true);
    expect((await configManager.getMatchingConfig({ message })).works).to.equal(true);
  });

  it("getMatchingConfig(): category of thread message", async () => {
    const configSchema = z.strictObject({
      works: z.boolean().default(false),
    });
    interface PluginType extends BasePluginType {
      configSchema: typeof configSchema;
    }

    const categoryId = "12345";
    const client = createMockClient();
    const guild = createMockGuild(client);
    const user = createMockUser(client);
    const channel = createMockTextChannel(client, guild.id, { parent_id: categoryId });
    const thread = createMockThread(channel);
    const message = createMockMessage(client, thread, user);

    const configManager = new PluginConfigManager<BasePluginData<PluginType>>(
      {},
      {
        configSchema,
        defaultOverrides: [
          {
            category: categoryId,
            config: {
              works: true,
            },
          },
        ],
        levels: {},
      },
    );
    await configManager.init();

    expect((await configManager.get()).works).to.equal(false);
    expect((await configManager.getMatchingConfig({ message })).works).to.equal(true);
  });

  it("getMatchingConfig(): thread", async () => {
    const configSchema = z.strictObject({
      works: z.boolean().default(false),
    });
    interface PluginType extends BasePluginType {
      configSchema: typeof configSchema;
    }

    const client = createMockClient();
    const guild = createMockGuild(client);
    const user = createMockUser(client);
    const channel = createMockTextChannel(client, guild.id);
    const thread = createMockThread(channel);
    const message = createMockMessage(client, thread, user);

    const configManager = new PluginConfigManager<BasePluginData<PluginType>>(
      {},
      {
        configSchema,
        defaultOverrides: [
          {
            thread: thread.id,
            config: {
              works: true,
            },
          },
        ],
        levels: {},
      },
    );
    await configManager.init();

    expect((await configManager.get()).works).to.equal(false);
    expect((await configManager.getMatchingConfig({ message })).works).to.equal(true);
  });

  it("getMatchingConfig(): is_thread", async () => {
    const configSchema = z.strictObject({
      works: z.boolean().default(false),
    });
    interface PluginType extends BasePluginType {
      configSchema: typeof configSchema;
    }

    const client = createMockClient();
    const guild = createMockGuild(client);
    const user = createMockUser(client);
    const channel = createMockTextChannel(client, guild.id);
    const thread = createMockThread(channel);
    const message = createMockMessage(client, thread, user);

    const configManager = new PluginConfigManager<BasePluginData<PluginType>>(
      {},
      {
        configSchema,
        defaultOverrides: [
          {
            is_thread: true,
            config: {
              works: true,
            },
          },
        ],
        levels: {},
      },
    );
    await configManager.init();

    expect((await configManager.get()).works).to.equal(false);
    expect((await configManager.getMatchingConfig({ message })).works).to.equal(true);
  });

  it("getMatchingConfig(): roles", async () => {
    const configSchema = z.strictObject({
      works: z.boolean().default(false),
    });
    interface PluginType extends BasePluginType {
      configSchema: typeof configSchema;
    }

    const client = createMockClient();
    const guild = createMockGuild(client);
    const user = createMockUser(client);
    const role = createMockRole(guild);
    const member = createMockMember(guild, user, { roles: [role.id] });
    const channel = createMockTextChannel(client, guild.id);
    const message = createMockMessage(client, channel, user);

    const configManager = new PluginConfigManager<BasePluginData<PluginType>>(
      {},
      {
        configSchema,
        defaultOverrides: [
          {
            role: role.id,
            config: {
              works: true,
            },
          },
        ],
        levels: {},
      },
    );
    configManager.setPluginData({ context: "guild", guild } as GuildPluginData<any>);
    await configManager.init();

    expect((await configManager.get()).works).to.equal(false);
    expect((await configManager.getMatchingConfig({ memberRoles: [role.id] })).works).to.equal(true);
    expect((await configManager.getMatchingConfig({ member })).works).to.equal(true);
    expect((await configManager.getMatchingConfig({ message })).works).to.equal(true);
  });

  // Test for bug fixed in commit 77c9a0df53b1699d8a2c396d22bef29aeca9483a
  it("support transformed properties", async () => {
    const configSchema = z.strictObject({
      dummy: z.number(),
      transformed: z.string().transform((v) => Number(v)),
    });
    interface PluginType extends BasePluginType {
      configSchema: typeof configSchema;
    }

    const configManager = new PluginConfigManager<BasePluginData<PluginType>>(
      {
        config: {
          dummy: 1,
          transformed: "20",
        },
      },
      {
        configSchema,
        defaultOverrides: [
          // Just the presence of an override would trigger the bug
          {
            level: ">=50",
            config: {
              dummy: 3,
            },
          },
        ],
        levels: {},
      },
    );
    await configManager.init();

    expect((await configManager.get()).transformed).to.equal(20);
  });

  it("reject invalid override criteria", async () => {
    const configSchema = z.strictObject({});
    interface PluginType extends BasePluginType {
      configSchema: typeof configSchema;
    }

    const configManager1 = new PluginConfigManager<BasePluginData<PluginType>>(
      {
        overrides: [
          {
            level: ">=50",
            // Missing config property
          },
        ],
      },
      {
        configSchema,
        defaultOverrides: [],
        levels: {},
      },
    );
    try {
      await configManager1.init();
      assert.fail("Config manager did not throw on missing override config");
    } catch (err) {}

    const configManager2 = new PluginConfigManager<BasePluginData<PluginType>>(
      {
        overrides: [
          {
            some_unknown_key: ">=50",
            config: {},
          },
        ],
      },
      {
        configSchema,
        defaultOverrides: [],
        levels: {},
      },
    );
    try {
      await configManager2.init();
      assert.fail("Config manager did not throw on unknown criteria key");
    } catch (err) {}

    const configManager3 = new PluginConfigManager<BasePluginData<PluginType>>(
      {
        overrides: [
          {
            level: 20, // Invalid type; should be a string
            config: {},
          },
        ],
      },
      {
        configSchema,
        defaultOverrides: [],
        levels: {},
      },
    );
    try {
      await configManager3.init();
      assert.fail("Config manager did not throw on invalid criteria value type");
    } catch (err) {}
  });

  it("reject invalid override config", async () => {
    const configSchema = z.strictObject({
      value: z.number(),
    });
    interface PluginType extends BasePluginType {
      configSchema: typeof configSchema;
    }

    const configManager = new PluginConfigManager<BasePluginData<PluginType>>(
      {
        config: {
          value: 5,
        },
        overrides: [
          {
            level: ">=50",
            config: {
              value: "not a number",
            },
          },
        ],
      },
      {
        configSchema,
        defaultOverrides: [],
        levels: {},
      },
    );
    try {
      await configManager.init();
      assert.fail("Config manager did not throw on invalid override config");
    } catch (err) {}
  });
});
