type QueueItem = () => void;
type FnToRun = () => void | Promise<void>;

export class ConcurrentRunner {
  #maxConcurrent: number;
  #running = 0;
  #queue: QueueItem[] = [];

  constructor(maxConcurrent: number) {
    this.#maxConcurrent = maxConcurrent;
  }

  #next() {
    if (this.#running >= this.#maxConcurrent) {
      return;
    }
    if (this.#queue.length === 0) {
      return;
    }
    this.#queue.shift()!();
  }

  run(fn: FnToRun): Promise<void> {
    return new Promise((resolve, reject) => {
      this.#queue.push(() => {
        this.#running++;
        Promise.resolve(fn())
          .then(() => resolve())
          .catch(err => reject(err))
          .finally(() => {
            this.#running--;
            this.#next();
          });
      });
      this.#next();
    });
  }
}
