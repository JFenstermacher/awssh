import {
  parse,
  stringify,
} from "https://deno.land/std@0.106.0/encoding/yaml.ts";

export const readYamlSafe = async (path: string) =>
  Deno.readTextFile(path)
    .then((data) => parse(data))
    .catch(() => null);

export const writeYaml = async (
  path: string,
  data: Record<string, unknown>,
): Promise<void> => Deno.writeTextFile(path, stringify(data));

export const getHomeDir = () => {
  const { env } = Deno;

  return env.get("HOME") ?? env.get("USERPROFILE") as string;
};
