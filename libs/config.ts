import { join } from "https://deno.land/std@0.106.0/path/mod.ts";
import { Checkbox } from "https://deno.land/x/cliffy@v0.19.5/prompt/checkbox.ts";
import { Input } from "https://deno.land/x/cliffy@v0.19.5/prompt/input.ts";
import { Select } from "https://deno.land/x/cliffy@v0.19.5/prompt/select.ts";
import {
  getHomeDir,
  isExecutable,
  readYamlSafe,
  writeYaml,
} from "../libs/util.ts";
import { Instances } from "./instances.ts";
import { Keys } from "./keys.ts";
import {
  BuildTypes,
  CacheTypes,
  Configuration as ConfigurationData,
  ConnectionTypes,
  OfflineCacheModes,
} from "./types.ts";

const HOME = getHomeDir();

type ConfigFunction = (config: ConfigurationData) => Promise<ConfigurationData>;
type ConfigMapping = {
  [key: string]: ConfigFunction;
};

export class Configuration {
  static defaults: ConfigurationData = {
    baseCommand: "ssh",
    defaultUser: "ec2-user",
    keysDirectory: join(HOME, ".ssh"),
    connectVia: [ConnectionTypes.PUBLIC, ConnectionTypes.PRIVATE],
    templateString: "${InstanceId} [${Tags.Name}]",
    offlineCacheMode: OfflineCacheModes.PROMPT,
  };

  static async get(): Promise<ConfigurationData> {
    const configPath = Configuration.getConfigPath();

    const config = await readYamlSafe(configPath) as ConfigurationData;

    return config ?? Configuration.defaults;
  }

  static async save(config: ConfigurationData) {
    const configPath = Configuration.getConfigPath();

    await writeYaml(configPath, config);
  }

  static getConfigPath() {
    const { build, env } = Deno;

    const home = getHomeDir();
    const xdg = env.get("XDG_CACHE_HOME");

    const osMapping: Record<BuildTypes, string[]> = {
      darwin: [home, ".config", "awssh", "config.yaml"],
      windows: [home, "%LOCALAPPDATA%", "awssh", "config.yaml"],
      linux: [home, ".config", "awssh", "config.yaml"],
    };

    return xdg
      ? join(xdg, "awssh", "config.yaml")
      : join(...osMapping[build.os]);
  }

  static async prompt() {
    let config = await Configuration.get();

    const funcMapping: ConfigMapping = {
      "Base Command": Configuration.configureCommand,
      "Connection Priority": Configuration.configureConnection,
      "Configure Instance List Template": Configuration.configureTemplate,
      "Keys Home Directory": Configuration.configureKeysHome,
      "Offline Cache Configuration": Configuration.configureCache,
      "Reset Defaults": async (_) => Configuration.defaults,
      "Wipe Cache": Configuration.wipeCache,
    };

    while (true) {
      const funcName = await Select.prompt({
        message: "Choose an item to configure (ESC to exit)",
        options: Object.keys(funcMapping),
      });

      config = await funcMapping[funcName](config);

      await Configuration.save(config);
    }
  }

  static async configureCommand(config: ConfigurationData) {
    const baseCommand = await Input.prompt({
      message: "What will the base SSH command be",
      default: config.baseCommand,
    });

    config.baseCommand = baseCommand;

    return config;
  }

  static async configureKeysHome(config: ConfigurationData) {
    const keysDirectory = await Input.prompt({
      message: "Where are you SSH keys stored",
      default: config.keysDirectory,
      validate: async (value: string) => {
        const { isDirectory } = await Deno.stat(value)
          .catch(() => ({ isDirectory: false }));

        return isDirectory ? true : "Please provide a valid directory";
      },
    });

    config.keysDirectory = keysDirectory;

    return config;
  }

  static async configureTemplate(config: ConfigurationData) {
    const templateString = await Input.prompt({
      message: "Set the instance output string template",
    });

    config.templateString = templateString;

    return config;
  }

  static async configureConnection(config: ConfigurationData) {
    const ssm = await isExecutable("session-manager-plugin");

    let options = [ConnectionTypes.PUBLIC, ConnectionTypes.PRIVATE];
    if (ssm) options.push(ConnectionTypes.SSM);

    config.connectVia = [];
    while (options.length > 1) {
      const count = config.connectVia.length ? "second" : "first";
      const choice = await Select.prompt({
        message: `Your ${count} attempt to connect instances`,
        options,
      });

      config.connectVia.push(choice as ConnectionTypes);
      options = options.filter((opt) => opt !== choice);
    }

    config.connectVia.push(options.pop() as ConnectionTypes);

    return config;
  }

  static async configureCache(config: ConfigurationData) {
    const cacheMode = await Select.prompt({
      message: "How should offline cache be configured",
      options: Object.values(OfflineCacheModes),
    }) as OfflineCacheModes;

    config.offlineCacheMode = cacheMode;

    return config;
  }

  static async wipeCache(config: ConfigurationData) {
    const options = Object.entries(CacheTypes).map(([name, value]) => ({
      name,
      value,
    }));

    const caches = await Checkbox.prompt({
      message: "Which caches should be wiped",
      options,
    }) as CacheTypes[];

    for (const cache of caches) {
      switch (cache) {
        case CacheTypes.Instances: {
          await Instances.wipe();
          break;
        }

        case CacheTypes.Keys: {
          await Keys.wipe();
          break;
        }

        default: {
          console.error("Not sure how this occured");
        }
      }
    }

    return config;
  }
}
