import fs from "fs";
import path from "path";
import { promisify } from "util";

import { BaseConfig } from "./BaseConfig";

const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);

export interface IConfig {
  [key: string]: any;
}

export class JsonConfig extends BaseConfig {
  protected path: string;
  protected saveQueue: Promise<any>;
  protected config: IConfig;

  constructor(filePath: string) {
    super();
    this.path = filePath;
    this.config = null;

    this.saveQueue = Promise.resolve();
  }

  public async get(key: string, def: any = null): Promise<any> {
    await this.loadConfig();

    if (typeof this.config[key] !== "undefined") {
      return this.config[key];
    }

    return def;
  }

  public async set(key: string, value: any): Promise<void> {
    this.saveQueue = this.saveQueue.then(() => {
      this.config[key] = value;
      return this.saveConfig();
    });
  }

  public async delete(key: string): Promise<void> {
    this.saveQueue = this.saveQueue.then(() => {
      delete this.config[key];
      return this.saveConfig();
    });
  }

  public async all(): Promise<IConfig> {
    return this.config;
  }

  protected async loadConfig(): Promise<void> {
    await this.saveQueue;

    if (!this.config) {
      try {
        const data = await readFileAsync(this.path, { encoding: "utf8" });
        this.config = JSON.parse(data);
      } catch (e) {
        this.config = {};
      }
    }
  }

  protected async saveConfig(): Promise<void> {
    await writeFileAsync(this.path, JSON.stringify(this.config, null, 2), {
      encoding: "utf8"
    });
  }
}
