import { join } from "https://deno.land/std@0.106.0/path/mod.ts";
import { getHomeDir, readYamlSafe, writeYaml } from "../libs/util.ts";
import { BuildTypes, Configuration } from "./types.ts";

const HOME = getHomeDir();

export const CONFIG_DEFAULTS: Configuration = {
  baseCommand: "ssh",
  defaultUser: "ec2-user",
  keysDirectory: join(HOME, ".ssh"),
  connectVia: ["public", "private"],
  templateString: "${InstanceId} [${Tags.Name}]",
};

export const getConfigPath = () => {
  const { build, env } = Deno;
  const home = env.get("XDG_CONFIG_HOME") ?? join(HOME, ".config");

  const osMapping: Record<BuildTypes, string[]> = {
    darwin: [home, "awssh", "config.yaml"],
    linux: [home, "awssh", "config.yaml"],
    windows: [HOME, "%LOCALAPPDATA%", "awssh", "config.yaml"],
  };

  return join(...osMapping[build.os]);
};

export const readConfig = async (path?: string): Promise<Configuration> => {
  const configPath = path ?? getConfigPath();

  const config = await readYamlSafe(configPath) as Configuration;

  return config ?? CONFIG_DEFAULTS;
};

export const writeConfig = async (
  config: Configuration,
  path?: string,
): Promise<void> => {
  const configPath = path ?? getConfigPath();

  await writeYaml(configPath, config);
};
