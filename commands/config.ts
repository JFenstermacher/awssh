import { Command } from "https://deno.land/x/cliffy@v0.19.5/command/mod.ts";
import {
  Checkbox,
  Input,
  Select,
} from "https://deno.land/x/cliffy@v0.19.5/prompt/mod.ts";
import { writeInstanceCache, writeKeysCache } from "../libs/cache.ts";
import { CONFIG_DEFAULTS, readConfig, writeConfig } from "../libs/config.ts";
import {
  CacheTypes,
  Configuration,
  ConnectionTypes,
  OfflineCacheModes,
} from "../libs/types.ts";
import { isExecutable } from "../libs/util.ts";

type ConfigFunction = (config: Configuration) => Promise<Configuration>;
type ConfigMapping = {
  [key: string]: ConfigFunction;
};

export const configureAction = async () => {
  let config = await readConfig();

  const funcMapping: ConfigMapping = {
    "Base Command": configureBaseCommand,
    "Connection Priority": configureConnection,
    "Configure Instance List Template": configureTemplate,
    "Keys Home Directory": configureKeysHome,
    "Offline Cache Configuration": configureOfflineCache,
    "Reset Defaults": resetDefaults,
    "Wipe Cache": wipeCacheData,
  };

  while (true) {
    const funcName = await Select.prompt({
      message: "Choose an item to configure (ESC to exit)",
      options: Object.keys(funcMapping),
    });

    config = await funcMapping[funcName](config);

    await writeConfig(config);
  }
};

export const configureBaseCommand: ConfigFunction = async (config) => {
  const baseCommand = await Input.prompt({
    message: "What will the base SSH command be",
    default: config.baseCommand,
  });

  config.baseCommand = baseCommand;

  return config;
};

export const configureKeysHome: ConfigFunction = async (config) => {
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
};

export const configureTemplate: ConfigFunction = async (config) => {
  const templateString = await Input.prompt({
    message: "Set the instance output string template",
  });

  config.templateString = templateString;

  return config;
};

export const configureConnection: ConfigFunction = async (config) => {
  const ssm = await isExecutable(["session-manager-plugin", "--version"]);

  let options = ["public", "private"];
  if (ssm) options.push("ssm");

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
};

export const configureOfflineCache: ConfigFunction = async (config) => {
  const cacheMode = await Select.prompt({
    message: "How should offline cache be configured",
    options: Object.values(OfflineCacheModes),
  }) as OfflineCacheModes;

  config.offlineCache = cacheMode;

  return config;
};

export const wipeCacheData: ConfigFunction = async (config) => {
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
        await writeInstanceCache();
        break;
      }

      case CacheTypes.Keys: {
        await writeKeysCache();
        break;
      }

      default: {
        console.error("Not sure how this occured");
      }
    }
  }

  return config;
};

export const resetDefaults: ConfigFunction = async (_) => CONFIG_DEFAULTS;

export const configureCmd = new Command()
  .description("Configure your SSH and SCP options")
  .action(configureAction);
