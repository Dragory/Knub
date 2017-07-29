import { expect } from "chai";
import { Client } from "eris";

import { BasePlugin } from "../src/BasePlugin";
import BotFramework from "../src/index";

class CustomPlugin extends BasePlugin {
  public load() {
    // Works
  }
}

const erisBot = new Client("");
const bot = new BotFramework(
  erisBot,
  {
    custom: CustomPlugin
  },
  {}
);

describe("Main", async () => {
  it("should load plugins", async () => {
    const result = await bot.initGuild("1");
  });
});
