import {
  Input,
  Select,
} from "https://deno.land/x/cliffy@v0.19.5/prompt/mod.ts";
import { Configuration, writeConfig } from "../libs/config.ts";

type ConfigFunction = (config: Configuration) => Promise<Configuration>;
type ConfigMapping = {
  [key: string]: ConfigFunction;
};

export const configAction = async (config: Configuration) => {
  const funcMapping: ConfigMapping = {
    "Base Command": configBaseCommand,
    "Connection Priority": configBaseCommand,
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
