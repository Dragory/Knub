import { IPluginOptions, Plugin } from "./index";
import { IMatchParams } from "./configUtils";
import { expect } from "chai";
import { Client } from "eris";
import { PluginConfigManager } from "./PluginConfigManager";

describe("Plugin", () => {
  describe("hasPermission", () => {
    let dummyBot = new Client("", {});

    class PermissionTestPlugin extends Plugin {
      protected getDefaultOptions(): IPluginOptions<{
        can_do: boolean;
        nested: { also_can_do: boolean };
      }> {
        return {
          config: {
            can_do: false,
            nested: {
              also_can_do: false
            }
          },
          overrides: [
            {
              level: ">=20",
              config: {
                can_do: true
              }
            },
            {
              level: ">=30",
              config: {
                nested: {
                  also_can_do: true
                }
              }
            }
          ]
        };
      }

      public testPermissions(perm: string, matchParams: IMatchParams) {
        return this.hasPermission(perm, matchParams);
      }
    }

    const plugin = new PermissionTestPlugin({
      client: dummyBot,
      commands: undefined,
      config: new PluginConfigManager({ config: {} }, {}),
      cooldowns: undefined,
      events: undefined,
      getPlugin(foo: undefined): undefined {
        return undefined;
      },
      guild: undefined,
      guildConfig: undefined,
      knub: undefined,
      locks: undefined
    });

    it("should use defaults with empty/non-matching params", () => {
      const result = plugin.testPermissions("can_do", {});
      expect(result).to.equal(false);
    });

    it("should work for single-level permissions", () => {
      const result = plugin.testPermissions("can_do", { level: 20 });
      expect(result).to.equal(true);
    });

    it("should use defaults with empty/non-matching params (nested)", () => {
      const result = plugin.testPermissions("nested.also_can_do", {});
      expect(result).to.equal(false);
    });

    it("should work for nested permissions", () => {
      const result1 = plugin.testPermissions("nested.also_can_do", {
        level: 20
      });
      const result2 = plugin.testPermissions("nested.also_can_do", {
        level: 30
      });
      expect(result1).to.equal(false);
      expect(result2).to.equal(true);
    });

    dummyBot = null;
  });
});
