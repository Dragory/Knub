import { expect, assert } from "chai";
import { PluginConfigManager } from "./PluginConfigManager";
import { sleep } from "../testUtils";
import { ConfigValidationError } from "./ConfigValidationError";

describe("PluginConfigManager", () => {
  it("merge user config with default config", () => {
    const configManager = new PluginConfigManager(
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
      }
    );

    expect(configManager.get().can_do).to.equal(true);
    expect(configManager.get().nested.one).to.equal(10);
    expect(configManager.get().nested.two).to.equal(30);
  });

  it("merge user overrides with default overrides", () => {
    const configManager = new PluginConfigManager(
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
      }
    );

    expect(configManager.get().can_do).to.equal(false);
    expect(configManager.getMatchingConfig({ level: 20 }).can_do).to.equal(true);
    expect(configManager.getMatchingConfig({ level: 40 }).can_do).to.equal(false);
    expect(configManager.getMatchingConfig({ level: 50 }).can_do).to.equal(true);
  });

  it("replace default overrides", () => {
    const configManager = new PluginConfigManager(
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
      }
    );

    expect(configManager.get().can_do).to.equal(false);
    expect(configManager.getMatchingConfig({ level: 50 }).can_do).to.equal(false);
    expect(configManager.getMatchingConfig({ level: 100 }).can_do).to.equal(true);
  });

  it("Preprocessors", async () => {
    const configManager = new PluginConfigManager(
      {
        config: {},
      },
      {
        config: {
          someThing: 5,
        },
      },
      {},
      null,
      (opts) => {
        opts.config.someThing = 7;
        return opts;
      }
    );
    await configManager.init();

    expect(configManager.get().someThing).to.equal(7);
  });

  it("Async preprocessors", async () => {
    const configManager = new PluginConfigManager(
      {
        config: {},
      },
      {
        config: {
          someThing: 5,
        },
      },
      {},
      null,
      async (opts) => {
        await sleep(1);
        opts.config.someThing = 20;
        return opts;
      }
    );
    await configManager.init();

    expect(configManager.get().someThing).to.equal(20);
  });

  it("Validators", async () => {
    const configManager = new PluginConfigManager(
      {
        config: {},
      },
      {
        config: {
          someThing: 5,
        },
      },
      {},
      null,
      null,
      () => {
        throw new ConfigValidationError("Test");
      }
    );

    try {
      await configManager.init();
    } catch (e) {
      if (e instanceof ConfigValidationError) {
        return;
      }
    }

    assert.fail("Config validator was not called");
  });

  it("Async validators", async () => {
    const configManager = new PluginConfigManager(
      {
        config: {},
      },
      {
        config: {
          someThing: 5,
        },
      },
      {},
      null,
      null,
      async () => {
        await sleep(1);
        throw new ConfigValidationError("Test");
      }
    );

    try {
      await configManager.init();
    } catch (e) {
      if (e instanceof ConfigValidationError) {
        return;
      }
    }

    assert.fail("Config validator was not called");
  });
});
