import { assert, expect } from "chai";
import { describe, it } from "mocha";
import { sleep } from "../testUtils.ts";
import { CooldownManager } from "./CooldownManager.ts";

describe("CooldownManager", () => {
  it("getCooldownRemaining() initial value", () => {
    const cooldownManager = new CooldownManager();
    cooldownManager.setCooldown("test", 1000);
    assert.strictEqual(cooldownManager.getCooldownRemaining("test"), 1000);
    cooldownManager.destroy();
  });

  it("getCooldownRemaining() after delay", async () => {
    const cooldownManager = new CooldownManager();
    cooldownManager.setCooldown("test", 1000);
    await sleep(10);
    assert.ok(cooldownManager.getCooldownRemaining("test") < 1000);
    cooldownManager.destroy();
  });

  it("getCooldownRemaining() expired", async () => {
    const cooldownManager = new CooldownManager();
    cooldownManager.setCooldown("test", 10);
    await sleep(20);
    assert.strictEqual(cooldownManager.getCooldownRemaining("test"), 0);
    cooldownManager.destroy();
  });

  it("getCooldownRemaining() unknown", () => {
    const cooldownManager = new CooldownManager();
    assert.strictEqual(cooldownManager.getCooldownRemaining("nonexistent"), 0);
    cooldownManager.destroy();
  });

  it("isOnCooldown() initial", () => {
    const cooldownManager = new CooldownManager();
    cooldownManager.setCooldown("test", 1000);
    assert.ok(cooldownManager.isOnCooldown("test"));
    cooldownManager.destroy();
  });

  it("isOnCooldown() after delay", async () => {
    const cooldownManager = new CooldownManager();
    cooldownManager.setCooldown("test", 1000);
    await sleep(10);
    assert.ok(cooldownManager.isOnCooldown("test"));
    cooldownManager.destroy();
  });

  it("isOnCooldown() expired", async () => {
    const cooldownManager = new CooldownManager();
    cooldownManager.setCooldown("test", 10);
    await sleep(20);
    assert.ok(!cooldownManager.isOnCooldown("test"));
    cooldownManager.destroy();
  });

  it("isOnCooldown() unknown", () => {
    const cooldownManager = new CooldownManager();
    assert.ok(!cooldownManager.isOnCooldown("nonexistent"));
    cooldownManager.destroy();
  });
});
