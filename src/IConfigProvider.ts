export interface IConfigProvider {
  has(path: any): Promise<boolean>;
  get(path: any, def?: any): Promise<any>;
  [key: string]: any;
}
