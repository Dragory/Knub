const CLEANUP_INTERVAL = 1000 * 60 * 5; // 5min

export class CooldownManager {
  protected cooldowns: Map<string, number>;

  protected cleanupTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.cooldowns = new Map<string, number>();
    this.cleanupTimeout = setTimeout(() => this.cleanup(), CLEANUP_INTERVAL);
  }

  protected cleanup(): void {
    const now = Date.now();
    for (const [key, cdEnd] of this.cooldowns.entries()) {
      if (cdEnd < now) this.cooldowns.delete(key);
    }

    this.cleanupTimeout = setTimeout(() => this.cleanup(), CLEANUP_INTERVAL);
  }

  public setCooldown(key: string, timeMs: number): void {
    const cdEnd = Date.now() + timeMs;
    this.cooldowns.set(key, cdEnd);
  }

  public isOnCooldown(key: string): boolean {
    if (!this.cooldowns.has(key)) return false;
    return this.cooldowns.get(key)! >= Date.now();
  }

  public getCooldownRemaining(key: string): number {
    if (!this.isOnCooldown(key)) return 0;
    return Math.max(0, this.cooldowns.get(key)! - Date.now());
  }

  public destroy(): void {
    if (this.cleanupTimeout) {
      clearTimeout(this.cleanupTimeout);
      this.cleanupTimeout = null;
    }
  }
}
