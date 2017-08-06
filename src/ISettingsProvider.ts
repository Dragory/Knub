export interface ISettingsProvider {
  get(key: any, def?: any): Promise<any>;
  set(key: any, value: any): Promise<any>;
  delete(key: any): Promise<any>;
  all(): Promise<any>;
}
