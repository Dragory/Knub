import * as fs from "fs";
import { promisify } from "util";

import yaml from "js-yaml";
import at from "lodash.at";

import { IConfigProvider } from "./IConfigProvider";

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
    return at(this.config, [path])[0];
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

    if (!this.config) {
      if (this.loadPromise) {
        return this.loadPromise;
      }

      this.loadPromise = Promise.resolve(
        (async () => {
          try {
            const data = await readFileAsync(this.path, { encoding: "utf8" });
            this.config = yaml.safeLoad(data);
          } catch (e) {
            this.config = {};
          }
        })()
      );
    }
  }
}
