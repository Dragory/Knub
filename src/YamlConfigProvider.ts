import * as fs from "fs";
import { promisify } from "util";

import * as yaml from "js-yaml";
const at = require("lodash.at");

import { IConfigProvider } from "./IConfigProvider";
import { logger } from "./logger";

const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);

export interface IConfig {
  [key: string]: any;
}

export class YamlConfigProvider implements IConfigProvider {
  protected path: string;
  protected config: IConfig;
  protected loadPromise: Promise<any>;
  protected saveQueue: Promise<any>;

  constructor(filePath: string) {
    this.path = filePath;
    this.config = null;
    this.loadPromise = null;
  }

  public async get(path: string, def: any = null): Promise<any> {
    await this.loadConfig();

    const value = at(this.config, [path])[0];

    if (value != null) {
      return value;
    } else {
      return def;
    }
  }

  public async has(path: string): Promise<boolean> {
    return (await this.get(path)) != null;
  }

  public async write(yamlString: string): Promise<void> {
    let parsed;

    try {
      parsed = yaml.safeLoad(yamlString);
    } catch (e) {
      throw new Error(`Invalid YAML`);
    }

    await writeFileAsync(this.path, yamlString, {
      encoding: "utf8"
    });

    this.config = parsed;
  }

  protected async loadConfig(): Promise<void> {
    await this.saveQueue;

    if (this.config) {
      return;
    }

    if (!this.loadPromise) {
      this.loadPromise = Promise.resolve(
        (async () => {
          try {
            const data = await readFileAsync(this.path, { encoding: "utf8" });
            this.config = yaml.safeLoad(data);
          } catch (e) {
            logger.warn(`Could not parse config at ${this.path}`);
            logger.warn(`[YAML] ${String(e)}`);
            this.config = {};
          }
        })()
      );
    }

    return this.loadPromise;
  }
}
