import { createHash } from "https://deno.land/std@0.101.0/hash/mod.ts";
import {
  parse,
  stringify,
} from "https://deno.land/std@0.106.0/encoding/yaml.ts";
import { dirname } from "https://deno.land/std@0.106.0/path/mod.ts";

export const readYamlSafe = async (path: string) =>
  Deno.readTextFile(path)
    .then((data) => parse(data))
    .catch(() => null);

export const writeYaml = async (
  path: string,
  data: any,
): Promise<void> => {
  await Deno.mkdir(dirname(path), { recursive: true });

  await Deno.writeTextFile(path, stringify(data));
};

export const getHomeDir = () => {
  const { env } = Deno;

  return env.get("HOME") ?? env.get("USERPROFILE") as string;
};

export const isExecutable = async (executable: string): Promise<boolean> => {
  const cmd = ["which", executable];
  const process = Deno.run({ cmd, stdout: "null" });

  const { success } = await process.status();

  return success;
};

export const createFileHash = async (path: string): Promise<string | null> => {
  const contents = await Deno.readTextFile(path).catch((_) => null);

  const hash = createHash("md5");

  return contents ? hash.update(contents).toString() : null;
};
