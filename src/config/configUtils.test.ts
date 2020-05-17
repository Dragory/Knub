import { expect } from "chai";
import { getMatchingPluginConfig, MatchParams, mergeConfig } from "./configUtils";
import { PluginOptions } from "../index";
import { BasePluginType } from "../plugins/pluginTypes";

describe("configUtils", () => {
  describe("mergeConfig", () => {
    const base = {
      foo: 1,
      bar: {
        baz: 2,
        qux: 3,
      },
      simpleArr: [1, 2],
      addArr: [1, 2],
      subArr: [1, 2],
    };

    const override = {
      foo: 2,
      bar: {
        baz: 5,
        quux: 10,
      },
      simpleArr: ["a", "b"],
      "+addArr": [3],
      "-subArr": [1],
    };

    const result: any = mergeConfig<any>(base, override);

    it("should overwrite scalar values", () => {
      expect(result.foo).to.equal(2);
    });

    it("should overwrite nested scalar values", () => {
      expect(result.bar.baz).to.equal(5);
    });

    it("should merge objects instead of overwriting them", () => {
      expect(result.bar.qux).to.equal(3);
      expect(result.bar.quux).to.equal(10);
    });

    it("should overwrite arrays", () => {
      expect(result.simpleArr).to.eql(["a", "b"]);
    });

    it("should not support adding to arrays anymore", () => {
      expect(result.addArr).to.eql([1, 2]);
    });

    it("should not support removing from arrays anymore", () => {
      expect(result.addArr).to.eql([1, 2]);
    });
  });

  describe("getMatchingPluginConfig", () => {
    interface SharedPluginType extends BasePluginType {
      config: {
        value: number;
        hasAccess: boolean;
      };
    }

    const sharedPluginOptions: PluginOptions<SharedPluginType> = {
      config: {
        value: 5,
        hasAccess: false,
      },
      overrides: [
        {
          level: ">=20",
          config: {
            hasAccess: true,
          },
        },
        {
          level: [">=30", "<40"],
          config: {
            hasAccess: false,
          },
        },
        {
          level: [],
          config: {
            value: 50,
          },
        },
        {
          channel: ["1100", "1200"],
          config: {
            value: 10,
          },
        },
        {
          user: "2100",
          config: {
            value: 15,
          },
        },
        {
          role: ["3100", "!3200"],
          config: {
            value: 20,
          },
        },
        {
          channel: "1100",
          role: "3100",
          config: {
            value: 25,
          },
        },
        {
          category: ["9100", "9200"],
          config: {
            value: 120,
          },
        },
      ],
    };

    it("should use defaults with empty match params", () => {
      const matchedConfig = getMatchingPluginConfig<SharedPluginType>(null as any, sharedPluginOptions, {});
      expect(matchedConfig.value).to.equal(5);
      expect(matchedConfig.hasAccess).to.equal(false);
    });

    it("should match levels", () => {
      const matchedConfig = getMatchingPluginConfig<SharedPluginType>(null as any, sharedPluginOptions, {
        level: 60,
      });
      expect(matchedConfig.hasAccess).to.equal(true);
    });

    it("should require all level conditions to apply", () => {
      const matchedConfig = getMatchingPluginConfig<SharedPluginType>(null as any, sharedPluginOptions, {
        level: 35,
      });
      expect(matchedConfig.hasAccess).to.equal(false);
    });

    it("should match channels and accept any specified channel", () => {
      const matchedConfig1 = getMatchingPluginConfig<SharedPluginType>(null as any, sharedPluginOptions, {
        channelId: "1100",
      });
      const matchedConfig2 = getMatchingPluginConfig<SharedPluginType>(null as any, sharedPluginOptions, {
        channelId: "1200",
      });
      expect(matchedConfig1.value).to.equal(10);
      expect(matchedConfig2.value).to.equal(10);
    });

    it("should match categories and accept any specified category", () => {
      const matchedConfig1 = getMatchingPluginConfig<SharedPluginType>(null as any, sharedPluginOptions, {
        categoryId: "9100",
      });
      const matchedConfig2 = getMatchingPluginConfig<SharedPluginType>(null as any, sharedPluginOptions, {
        categoryId: "9200",
      });
      expect(matchedConfig1.value).to.equal(120);
      expect(matchedConfig2.value).to.equal(120);
    });

    it("should match users", () => {
      const matchedConfig = getMatchingPluginConfig<SharedPluginType>(null as any, sharedPluginOptions, {
        userId: "2100",
      });
      expect(matchedConfig.value).to.equal(15);
    });

    it("should match roles", () => {
      const matchedConfig1 = getMatchingPluginConfig<SharedPluginType>(null as any, sharedPluginOptions, {
        memberRoles: ["3100"],
      });
      const matchedConfig2 = getMatchingPluginConfig<SharedPluginType>(null as any, sharedPluginOptions, {
        memberRoles: ["3100", "3200"],
      });
      expect(matchedConfig1.value).to.equal(20); // has 3100, and no 3200 -> match
      expect(matchedConfig2.value).to.equal(5); // has 3100, and excluded 3200 -> no match
    });

    it("custom resolver", () => {
      interface CustomPluginType extends BasePluginType {
        config: {
          value: number;
        };
        customOverrideCriteria: {
          targetUserId?: string;
          targetChannelId?: string;
        };
      }

      const customPluginOptions: PluginOptions<CustomPluginType> = {
        config: {
          value: 5,
        },
        overrides: [
          {
            extra: {
              targetUserId: "1234",
            },
            config: {
              value: 10,
            },
          },
          {
            extra: {
              targetUserId: "5678",
            },
            config: {
              value: 20,
            },
          },
          {
            extra: {
              targetUserId: "5678",
              targetChannelId: "9000",
            },
            config: {
              value: 30,
            },
          },
        ],
      };

      const customResolver = (
        pluginData,
        criteria: CustomPluginType["customOverrideCriteria"],
        matchParams: MatchParams
      ): boolean => {
        if (criteria.targetUserId && matchParams.extra.targetUserId !== criteria.targetUserId) return false;
        if (criteria.targetChannelId && matchParams.extra.targetChannelId !== criteria.targetChannelId) return false;
        return true;
      };

      const matchedConfig1 = getMatchingPluginConfig<CustomPluginType>(
        null as any,
        customPluginOptions,
        {
          extra: {
            targetUserId: "1234",
          },
        },
        customResolver
      );
      const matchedConfig2 = getMatchingPluginConfig<CustomPluginType>(
        null as any,
        customPluginOptions,
        {
          extra: {
            targetUserId: "5678",
          },
        },
        customResolver
      );
      const matchedConfig3 = getMatchingPluginConfig<CustomPluginType>(
        null as any,
        customPluginOptions,
        {
          extra: {
            targetUserId: "0001",
          },
        },
        customResolver
      );
      const matchedConfig4 = getMatchingPluginConfig<CustomPluginType>(
        null as any,
        customPluginOptions,
        {
          extra: {
            targetUserId: "5678",
            targetChannelId: "9000",
          },
        },
        customResolver
      );

      expect(matchedConfig1.value).to.equal(10);
      expect(matchedConfig2.value).to.equal(20);
      expect(matchedConfig3.value).to.equal(5);
      expect(matchedConfig4.value).to.equal(30);
    });

    it("false when no conditions are present", () => {
      const pluginOpts: PluginOptions = {
        config: {
          value: 5,
        },
        overrides: [
          {
            config: {
              value: 20,
            },
          },
        ],
      };

      const matchedConfig = getMatchingPluginConfig(null as any, pluginOpts, {});
      expect((matchedConfig as any).value).to.equal(5);
    });

    it("false when an empty 'all' condition is present", () => {
      const pluginOpts: PluginOptions = {
        config: {
          value: 5,
        },
        overrides: [
          {
            user: "500",
            all: [],
            config: {
              value: 20,
            },
          },
        ],
      };

      const matchedConfig = getMatchingPluginConfig(null as any, pluginOpts, {
        userId: "500",
      });
      expect((matchedConfig as any).value).to.equal(5);
    });

    it("false when an empty 'any' condition is present", () => {
      const pluginOpts: PluginOptions = {
        config: {
          value: 5,
        },
        overrides: [
          {
            user: "500",
            any: [],
            config: {
              value: 20,
            },
          },
        ],
      };

      const matchedConfig = getMatchingPluginConfig(null as any, pluginOpts, {
        userId: "500",
      });
      expect((matchedConfig as any).value).to.equal(5);
    });

    it("false when an unknown condition is present", () => {
      const pluginOpts: PluginOptions = {
        config: {
          value: 5,
        },
        overrides: [
          {
            user: "500",
            unknown: "foo",
            config: {
              value: 20,
            },
          } as any,
        ],
      };

      const matchedConfig = getMatchingPluginConfig(null as any, pluginOpts, {
        userId: "500",
      });
      expect((matchedConfig as any).value).to.equal(5);
    });

    it("'all' special criterion", () => {
      interface PluginType extends BasePluginType {
        config: {
          value: number;
        };
      }

      const pluginOpts: PluginOptions<PluginType> = {
        config: {
          value: 5,
        },
        overrides: [
          {
            user: "1000",
            all: [
              {
                level: ">=50",
              },
              {
                level: "<100",
              },
            ],
            config: {
              value: 10,
            },
          },
        ],
      };

      const matchedConfig1 = getMatchingPluginConfig<PluginType>(null as any, pluginOpts, {
        userId: "1000",
        level: 75,
      });
      const matchedConfig2 = getMatchingPluginConfig<PluginType>(null as any, pluginOpts, {
        userId: "1000",
        level: 120,
      });
      const matchedConfig3 = getMatchingPluginConfig<PluginType>(null as any, pluginOpts, {
        userId: "1000",
        level: 25,
      });

      expect(matchedConfig1.value).to.equal(10);
      expect(matchedConfig2.value).to.equal(5);
      expect(matchedConfig3.value).to.equal(5);
    });

    it("'any' special criterion", () => {
      interface PluginType extends BasePluginType {
        config: {
          value: number;
        };
      }

      const pluginOpts: PluginOptions<PluginType> = {
        config: {
          value: 5,
        },
        overrides: [
          {
            any: [
              {
                level: "<25",
              },
              {
                level: ">75",
              },
            ],
            config: {
              value: 10,
            },
          },
        ],
      };

      const matchedConfig1 = getMatchingPluginConfig<PluginType>(null as any, pluginOpts, {
        level: 15,
      });
      const matchedConfig2 = getMatchingPluginConfig<PluginType>(null as any, pluginOpts, {
        level: 95,
      });
      const matchedConfig3 = getMatchingPluginConfig<PluginType>(null as any, pluginOpts, {
        level: 50,
      });

      expect(matchedConfig1.value).to.equal(10);
      expect(matchedConfig2.value).to.equal(10);
      expect(matchedConfig3.value).to.equal(5);
    });

    it("'not' special criterion", () => {
      interface PluginType extends BasePluginType {
        config: {
          value: number;
        };
      }

      const pluginOpts1: PluginOptions<PluginType> = {
        config: {
          value: 5,
        },
        overrides: [
          // Matches as long as the user isn't 1234
          {
            not: {
              user: "1234",
            },
            config: {
              value: 10,
            },
          },
        ],
      };

      const pluginOpts2: PluginOptions<PluginType> = {
        config: {
          value: 5,
        },
        overrides: [
          // Matches if your level is greater than or equal to 50, as long as the user isn't 1234
          {
            all: [
              {
                level: ">=50",
              },
              {
                not: {
                  user: "1234",
                },
              },
            ],
            config: {
              value: 20,
            },
          },
        ],
      };

      const pluginOpts3: PluginOptions<PluginType> = {
        config: {
          value: 5,
        },
        overrides: [
          // Matches if your level is greater than or equal to 50 (via negation)
          {
            not: {
              level: "<50",
            },
            config: {
              value: 30,
            },
          },
        ],
      };

      const matchedConfig1 = getMatchingPluginConfig<PluginType>(null as any, pluginOpts1, {
        userId: "1234",
      });
      const matchedConfig2 = getMatchingPluginConfig<PluginType>(null as any, pluginOpts1, {
        userId: "5678",
      });

      expect(matchedConfig1.value).to.equal(5);
      expect(matchedConfig2.value).to.equal(10);

      const matchedConfig3 = getMatchingPluginConfig<PluginType>(null as any, pluginOpts2, {
        level: 95,
        userId: "1234",
      });
      const matchedConfig4 = getMatchingPluginConfig<PluginType>(null as any, pluginOpts2, {
        level: 95,
        userId: "5678",
      });

      expect(matchedConfig3.value).to.equal(5);
      expect(matchedConfig4.value).to.equal(20);

      const matchedConfig5 = getMatchingPluginConfig<PluginType>(null as any, pluginOpts3, {
        level: 49,
      });
      const matchedConfig6 = getMatchingPluginConfig<PluginType>(null as any, pluginOpts3, {
        level: 50,
      });
      const matchedConfig7 = getMatchingPluginConfig<PluginType>(null as any, pluginOpts3, {
        level: 51,
      });

      expect(matchedConfig5.value).to.equal(5);
      expect(matchedConfig6.value).to.equal(30);
      expect(matchedConfig7.value).to.equal(30);
    });
  });
});
