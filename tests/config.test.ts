import { assertEquals } from "https://deno.land/std@0.106.0/testing/asserts.ts";
import * as config from "../libs/config.ts";

Deno.test("Config path can be set via env var", async () => {
  Deno.env.set("XDG_CONFIG_HOME", Deno.cwd());

  const configPath = config.getConfigPath();

  assertEquals(configPath, `${Deno.cwd()}/awssh/config.yaml`);
});
