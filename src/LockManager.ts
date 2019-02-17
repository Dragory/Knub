const DEFAULT_LOCK_TIMEOUT = 10 * 1000;

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

  constructor(lockTimeout = DEFAULT_LOCK_TIMEOUT) {
    this.locks = new Map();
    this.lockTimeout = lockTimeout;
  }

  public acquire(keys: string | string[], lockTimeout) {
    if (!Array.isArray(keys)) keys = [keys];
    if (lockTimeout == null) lockTimeout = this.lockTimeout;

    // To acquire a lock, we must first wait for all matching old locks to resolve
    const oldLockPromises = keys.reduce(
      (lockPromises, key) => (this.locks.has(key) ? [...lockPromises, this.locks.get(key)] : lockPromises),
      []
    );
    const newLockPromise = Promise.all(oldLockPromises)
      .then(oldLocks => {
        // And then we have to wait for these old locks to unlock as well
        return Promise.all(oldLocks.map(l => l.unlockPromise));
      })
      .then(unlockedOldLocks => {
        // And *then* we can return a new lock
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
