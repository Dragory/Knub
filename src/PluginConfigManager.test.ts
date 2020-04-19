import { expect } from "chai";
import { PluginConfigManager } from "./PluginConfigManager";

describe("PluginConfigManager", () => {
  it("merge user config with default config", () => {
    const configManager = new PluginConfigManager(
      {
        config: {
          can_do: false,
          nested: {
            one: 10,
            two: 20
          }
        }
      },
      {
        config: {
          can_do: true,
          nested: {
            two: 30
          }
        }
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
          can_do: false
        },
        overrides: [
          {
            level: ">=50",
            config: {
              can_do: true
            }
          }
        ]
      },
      {
        overrides: [
          {
            level: ">=20",
            config: {
              can_do: true
            }
          },
          {
            level: ">=40",
            config: {
              can_do: false
            }
          }
        ]
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
          can_do: false
        },
        overrides: [
          {
            level: ">=50",
            config: {
              can_do: true
            }
          }
        ]
      },
      {
        replaceDefaultOverrides: true,
        overrides: [
          {
            level: ">=100",
            config: {
              can_do: true
            }
          }
        ]
      }
    );

    expect(configManager.get().can_do).to.equal(false);
    expect(configManager.getMatchingConfig({ level: 50 }).can_do).to.equal(false);
    expect(configManager.getMatchingConfig({ level: 100 }).can_do).to.equal(true);
  });
});
