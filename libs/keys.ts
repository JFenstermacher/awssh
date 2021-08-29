import { join } from "https://deno.land/std@0.101.0/node/path.ts";
import { Select } from "https://deno.land/x/cliffy@v0.19.5/prompt/select.ts";
import { Configuration, FormattedInstance, KeyCache } from "./types.ts";
import { createFileHash, isExecutable } from "./util.ts";

export const testFile = async (path: string): Promise<boolean> => {
  const process = Deno.run({
    cmd: ["ssh-keygen", "-l", "-f", path],
    stdout: "null",
  });

  const { success } = await process.status();

  return success;
};

export const listKeys = async ({ keysDirectory }: Configuration) => {
  const files = Deno.readDir(keysDirectory);

  const keygenExists = await isExecutable("ssh-keygen");
  const check = keygenExists ? testFile : async (_: string) => true;

  const keys: Record<string, string> = {};
  for await (const { name } of files) {
    const fullpath = join(keysDirectory, name);
    const isKey = await check(fullpath);

    if (isKey) keys[name] = fullpath;
  }

  return keys;
};

export const checkCache = async (
  { InstanceId }: FormattedInstance,
  cache: KeyCache,
) => {
  const { keyLocation, hash } = cache[InstanceId as string] || {};

  let key: string;
  if (keyLocation) {
    const currHash = await createFileHash(keyLocation);

    if (hash === currHash) key = keyLocation;
  }

  return key;
};

export const getKey = async (
  instance: FormattedInstance,
  config: Configuration,
  cache: KeyCache,
): Promise<string> => {
  const keys = await listKeys(config);
};

export const promptKey = async (keys: Record<string, string>) => {
  const options = Object.entries(keys).map(([name, value]) => ({
    name,
    value,
  }));

  const key = await Select.prompt({
    message: "Choose an identity file",
    options,
    search: true,
  });

  return key;
};
