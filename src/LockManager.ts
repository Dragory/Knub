import Timeout = NodeJS.Timeout;

const DEFAULT_LOCK_TIMEOUT = 10 * 1000;
const LOCK_GC_TIMEOUT = 120 * 1000;

export class Lock {
  public unlockPromise: Promise<Lock>;
  public interrupted: boolean;

  protected resolve;

  constructor(oldLocks: Lock[] = [], lockTimeout = DEFAULT_LOCK_TIMEOUT) {
    // A new lock can be built by combining the state from previous locks
    // For now, this means if any of the old locks was interrupted, the new one is as well
    this.interrupted = oldLocks.some(l => l && l.interrupted);

    this.unlockPromise = new Promise(resolve => {
      this.resolve = resolve;
    });

    setTimeout(() => this.unlock(), lockTimeout);
  }

  public unlock() {
    this.resolve(this);
  }

  public interrupt() {
    this.interrupted = true;
    this.unlock();
  }
}

export class LockManager {
  protected locks: Map<string, Promise<Lock>>;
  protected lockTimeout: number;
  protected lockGCTimeouts: Map<string, Timeout>;

  constructor(lockTimeout = DEFAULT_LOCK_TIMEOUT) {
    this.locks = new Map();
    this.lockTimeout = lockTimeout;
    this.lockGCTimeouts = new Map();
  }

  public acquire(keys: string | string[], lockTimeout: number = null) {
    if (!Array.isArray(keys)) keys = [keys];
    if (lockTimeout == null) lockTimeout = this.lockTimeout;

    keys.forEach(key => {
      clearTimeout(this.lockGCTimeouts.get(key));
      this.lockGCTimeouts.delete(key);
    });

    // To acquire a lock, we must first wait for all matching old locks to resolve
    const oldLockPromises = keys.reduce(
      (lockPromises, key) =>
        this.locks.has(key)
          ? [...lockPromises, this.locks.get(key)]
          : lockPromises,
      []
    );
    const newLockPromise = Promise.all(oldLockPromises)
      .then(oldLocks => {
        // And then we have to wait for these old locks to unlock as well
        return Promise.all(oldLocks.map(l => l.unlockPromise));
      })
      .then(unlockedOldLocks => {
        // And *then* we can return a new lock
        (keys as string[]).forEach(key => {
          this.lockGCTimeouts.set(
            key,
            setTimeout(() => {
              this.locks.delete(key);
              this.lockGCTimeouts.delete(key);
            }, LOCK_GC_TIMEOUT)
          );
        });

        return new Lock(unlockedOldLocks, lockTimeout);
      });

    for (const key of keys) {
      this.locks.set(key, newLockPromise);
    }

    return newLockPromise;
  }

  public setLockTimeout(ms: number) {
    this.lockTimeout = ms;
  }
}
