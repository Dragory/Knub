const CLEANUP_INTERVAL = 1000 * 60 * 5; // 5min

export class CooldownManager {
  protected cooldowns: Map<string, number>;

  constructor() {
    this.cooldowns = new Map<string, number>();
    setTimeout(() => this.cleanup(), CLEANUP_INTERVAL);
  }

  protected cleanup(): void {
    const now = Date.now();
    for (const [key, cdEnd] of this.cooldowns.entries()) {
      if (cdEnd < now) this.cooldowns.delete(key);
    }

    setTimeout(() => this.cleanup(), CLEANUP_INTERVAL);
  }

  public setCooldown(key: any, timeMs: number): void {
    const cdEnd = Date.now() + timeMs;
    this.cooldowns.set(key, cdEnd);
  }

  public isOnCooldown(key: any): boolean {
    if (!this.cooldowns.has(key)) return false;
    return this.cooldowns.get(key)! >= Date.now();
  }

  public getCooldownRemaining(key: any): number {
    if (!this.isOnCooldown(key)) return 0;
    return Math.max(0, this.cooldowns.get(key)! - Date.now());
  }
}
