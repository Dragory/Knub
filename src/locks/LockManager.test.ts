import { assert, expect } from "chai";
import { describe, it } from "mocha";
import { sleep } from "../testUtils";
import { LockManager } from "./LockManager";

describe("LockManager", () => {
  it("simple lock", async () => {
    const numbers: number[] = [];

    const lockManager = new LockManager();
    const lockName = "number-lock";

    const process1 = (async () => {
      const lock = await lockManager.acquire(lockName);
      numbers.push(1);
      await sleep(1);
      numbers.push(2);
      lock.unlock();
    })();

    const process2 = (async () => {
      const lock = await lockManager.acquire(lockName);
      numbers.push(3);
      await sleep(1);
      numbers.push(4);
      lock.unlock();
    })();

    const process3 = (async () => {
      numbers.push(5);
      numbers.push(6);
    })();

    await Promise.all([process1, process2, process3]);

    assert.deepStrictEqual(numbers, [5, 6, 1, 2, 3, 4]);

    await lockManager.destroy();
  });

  it("expiring lock", async () => {
    const lockManager = new LockManager(50);
    const lockName = "test-lock";
    let unlockedManually = false;

    const lock = await lockManager.acquire(lockName);
    setTimeout(() => {
      unlockedManually = true;
      lock.unlock();
    }, 100);

    await lockManager.acquire(lockName);
    assert.strictEqual(unlockedManually, false);

    await lockManager.destroy();
  });

  it("combined locks", async () => {
    const lockManager = new LockManager();
    const lock1Name = "test-lock-1";
    const lock2Name = "test-lock-2";

    let lock1Unlocked = false;
    let lock2Unlocked = false;
    const lock1 = await lockManager.acquire(lock1Name);
    const lock2 = await lockManager.acquire(lock2Name);
    setTimeout(() => {
      lock1Unlocked = true;
      lock1.unlock();
    }, 10);
    setTimeout(() => {
      lock2Unlocked = true;
      lock2.unlock();
    }, 50);

    let combinedLockUnlocked = false;
    // We should only be able to acquire this lock after lock1 and lock2 are *both* unlocked
    const combinedLock = await lockManager.acquire([lock1Name, lock2Name]);
    assert.strictEqual(lock1Unlocked, true);
    assert.strictEqual(lock2Unlocked, true);

    setTimeout(() => {
      combinedLockUnlocked = true;
      combinedLock.unlock();
    }, 10);

    // We should only be able to acquire either of the individual locks
    // after the combined lock encompassing them both is unlocked
    await Promise.race([lockManager.acquire(lock1Name), lockManager.acquire(lock2Name)]);
    assert.strictEqual(combinedLockUnlocked, true);

    await lockManager.destroy();
  });
});
