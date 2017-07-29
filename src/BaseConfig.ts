export abstract class BaseConfig {
  public abstract get(key: any, def?: any): Promise<any>;
  public abstract set(key: any, value: any): Promise<any>;
  public abstract delete(key: any): Promise<any>;
  public abstract all(): Promise<any>;
}
