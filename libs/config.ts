import { join } from "https://deno.land/std@0.106.0/path/mod.ts";
import { readYamlSafe, writeYaml } from "../libs/util.ts";

type BuildTypes = "darwin" | "linux" | "windows";
type ConnectionTypes = "pub" | "priv" | "ssm";

type Configuration = {
  baseCommand: string;
  defaultUser: string;
  keysDirectory: string;
  connectVia: ConnectionTypes[];
  templateString: string;
};

const { build, env } = Deno;
const HOME = env.get("HOME") ?? env.get("USERPROFILE") as string;

export const CONFIG_DEFAULTS: Configuration = {
  baseCommand: "ssh",
  defaultUser: "ec2-user",
  keysDirectory: join(HOME, ".ssh"),
  connectVia: ["pub", "priv"],
  templateString: "${InstanceId} [${Tags.Name}]",
};

export const getConfigPath = (os: BuildTypes) => {
  const xdgConfigHome = env.get("XDG_CONFIG_HOME");

  const osMapping: Record<BuildTypes, string[]> = {
    darwin: [HOME, ".config", "awssh", "config.yaml"],
    linux: [HOME, ".config", "awssh", "config.yaml"],
    windows: [HOME, "%LOCALAPPDATA", "awssh", "config.yaml"],
  };

  return xdgConfigHome ?? join(...osMapping[os]);
};

export const readConfig = async (path?: string): Promise<Configuration> => {
  const configPath = path ?? getConfigPath(build.os);

  const config = await readYamlSafe(configPath) as Configuration;

  return config ?? CONFIG_DEFAULTS;
};

export const writeConfig = async (
  config: Configuration,
  path?: string,
): Promise<void> => {
  const configPath = path ?? getConfigPath(build.os);

  await writeYaml(configPath, config);
};
