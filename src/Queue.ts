type InternalQueueFn = () => Promise<void>;
type AnyFn = (...args: any[]) => any;

const DEFAULT_TIMEOUT = 10 * 1000;

export class Queue<TQueueFunction extends AnyFn = AnyFn> {
  protected running = false;
  protected queue: InternalQueueFn[] = [];
  protected timeout: number;

  protected activeTimeout: NodeJS.Timeout | null = null;

  protected destroyed = false;

  protected current: Promise<void> = Promise.resolve();

  constructor(timeout = DEFAULT_TIMEOUT) {
    this.timeout = timeout;
  }

  public add(fn: TQueueFunction): Promise<void> {
    if (this.destroyed) {
      return Promise.resolve();
    }

    const promise = new Promise<void>((resolve, reject) => {
      this.queue.push(async () => {
        await Promise.resolve(fn()).then(resolve).catch(reject);
      });

      if (!this.running) this.next();
    });

    return promise;
  }

  protected next(): void {
    if (this.destroyed) {
      return;
    }

    this.running = true;

    if (this.queue.length === 0) {
      this.running = false;
      return;
    }

    const fn = this.queue.shift()!;
    this.current = new Promise((resolve) => {
      // Either fn() completes or the timeout is reached
      void fn().then(resolve);
      this.activeTimeout = setTimeout(resolve, this.timeout);
    }).then(() => {
      if (this.activeTimeout) {
        clearTimeout(this.activeTimeout);
      }
      return this.next();
    });
  }

  public clear(): void {
    this.queue.splice(0, this.queue.length);
  }

  public destroy(): void {
    this.clear();
    if (this.activeTimeout) {
      clearTimeout(this.activeTimeout);
    }
  }

  public async waitToFinish(): Promise<void> {
    while (true) {
      await this.current;
      if (this.queue.length === 0) {
        break;
      }
    }
  }
}
