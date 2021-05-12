import { CooldownManager } from "./CooldownManager";
import assert from "assert";
import { sleep } from "../testUtils";

describe("CooldownManager", () => {
  before(() => {
    process.on("unhandledRejection", (err) => {
      throw err;
    });
  });

  it("getCooldownRemaining() initial value", () => {
    const cooldownManager = new CooldownManager();
    cooldownManager.setCooldown("test", 1000);
    assert.strictEqual(cooldownManager.getCooldownRemaining("test"), 1000);
  });

  it("getCooldownRemaining() after delay", async () => {
    const cooldownManager = new CooldownManager();
    cooldownManager.setCooldown("test", 1000);
    await sleep(10);
    assert.ok(cooldownManager.getCooldownRemaining("test") < 1000);
  });

  it("getCooldownRemaining() expired", async () => {
    const cooldownManager = new CooldownManager();
    cooldownManager.setCooldown("test", 10);
    await sleep(20);
    assert.strictEqual(cooldownManager.getCooldownRemaining("test"), 0);
  });

  it("getCooldownRemaining() unknown", () => {
    const cooldownManager = new CooldownManager();
    assert.strictEqual(cooldownManager.getCooldownRemaining("nonexistent"), 0);
  });

  it("isOnCooldown() initial", () => {
    const cooldownManager = new CooldownManager();
    cooldownManager.setCooldown("test", 1000);
    assert.ok(cooldownManager.isOnCooldown("test"));
  });

  it("isOnCooldown() after delay", async () => {
    const cooldownManager = new CooldownManager();
    cooldownManager.setCooldown("test", 1000);
    await sleep(10);
    assert.ok(cooldownManager.isOnCooldown("test"));
  });

  it("isOnCooldown() expired", async () => {
    const cooldownManager = new CooldownManager();
    cooldownManager.setCooldown("test", 10);
    await sleep(20);
    assert.ok(!cooldownManager.isOnCooldown("test"));
  });

  it("isOnCooldown() unknown", () => {
    const cooldownManager = new CooldownManager();
    assert.ok(!cooldownManager.isOnCooldown("nonexistent"));
  });
});
