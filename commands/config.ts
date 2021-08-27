import { Command } from "https://deno.land/x/cliffy@v0.19.5/command/mod.ts";
import {
  Input,
  Select,
} from "https://deno.land/x/cliffy@v0.19.5/prompt/mod.ts";
import {
  Configuration,
  ConnectionTypes,
  readConfig,
  writeConfig,
} from "../libs/config.ts";
import { isExecutable } from "../libs/util.ts";

type ConfigFunction = (config: Configuration) => Promise<Configuration>;
type ConfigMapping = {
  [key: string]: ConfigFunction;
};

export const configAction = async () => {
  let config = await readConfig();

  const funcMapping: ConfigMapping = {
    "Base Command": configBaseCommand,
    "Connection Priority": configConnection,
    "Configure Instance List Template": configTemplate,
    "Keys Home Directory": configureKeysHome,
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

export const configBaseCommand: ConfigFunction = async (config) => {
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
    validate: async (value: string) => {
      const { isDirectory } = await Deno.stat(value);

      return isDirectory ?? "Please provide a valid directory";
    },
  });

  config.keysDirectory = keysDirectory;

  return config;
};

export const configTemplate: ConfigFunction = async (config) => {
  const templateString = await Input.prompt({
    message: "Set the instance output string template",
  });

  config.templateString = templateString;

  return config;
};

export const configConnection: ConfigFunction = async (config) => {
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

export const configCmd = new Command()
  .action(configAction);
