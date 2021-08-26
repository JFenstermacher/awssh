import {
  Input,
  prompt,
  Select,
} from "https://deno.land/x/cliffy@v0.19.5/prompt/mod.ts";
import { lookpath } from "https://raw.githubusercontent.com/otiai10/lookpath/main/src/index.ts";
import { Configuration, readConfig, writeConfig } from "../libs/config.ts";

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
  const ssm = await lookpath("session-manager-plugin");

  let choices = ["public", "private"];
  if (ssm) choices.push("ssm");

  const { first, second } = await prompt([
    {
      name: "first",
      message: "Your first attempt to connecto instances",
      type: Select,
      options: choices,
      after: async ({ first }, next) => {
        choices = choices.filter((ch) => ch !== first);
        await next();
      },
    },
    {
      name: "second",
      message: "Your second attempt to connecto instances",
      type: Select,
      options: choices,
      before: async (_, next) => next(true),
      after: async ({ second }, next) => {
        choices = choices.filter((ch) => ch !== second);
        await next();
      },
    },
  ]);

  config.connectVia = [first, second, choices.pop()];

  return config;
};
