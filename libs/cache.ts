import { join } from "https://deno.land/std@0.106.0/path/mod.ts";
import { getHomeDir, readYamlSafe, writeYaml } from "../libs/util.ts";
import {
  BuildTypes,
  CacheTypes,
  FormattedInstance,
  KeyCache,
} from "./types.ts";

const HOME = getHomeDir();

export const getCachePath = (cacheType: CacheTypes) => {
  const { build, env } = Deno;
  const home = env.get("XDG_CACHE_HOME") ?? join(HOME, ".config");

  const osMapping: Record<BuildTypes, string[]> = {
    darwin: [home, "awssh", `${cacheType}.yaml`],
    linux: [home, "awssh", `${cacheType}.yaml`],
    windows: [HOME, "%LOCALAPPDATA%", "awssh", "config.yaml"],
  };

  return join(...osMapping[build.os]);
};

export const readInstanceCache = async (
  path?: string,
): Promise<FormattedInstance[]> => {
  const instancesPath = path ?? getCachePath(CacheTypes.Instances);

  const instances = await readYamlSafe(instancesPath);

  return (instances ?? []) as FormattedInstance[];
};

export const readKeysCache = async (path?: string): Promise<KeyCache> => {
  const keysPath = path ?? getCachePath(CacheTypes.Keys);

  const keys = await readYamlSafe(keysPath);

  return (keys ?? []) as KeyCache;
};

export const readCaches = (): Promise<[FormattedInstance[], KeyCache]> =>
  Promise.all([
    readInstanceCache(),
    readKeysCache(),
  ]);
