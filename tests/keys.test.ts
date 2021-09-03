import { join } from "https://deno.land/std@0.101.0/node/path.ts";
import { assertEquals } from "https://deno.land/std@0.106.0/testing/asserts.ts";
import { Configuration } from "../libs/config.ts";
import { Keys } from "../libs/keys.ts";
import { Key } from "../libs/types.ts";
import { checkFileExists } from "./utilities.ts";

const TEST_KEY: Key = {
  name: "test-key",
  location: Deno.cwd(),
  hash: "test-hash",
};

Deno.test("Can save and wipe cache", async () => {
  const cacheDir = join(Deno.cwd(), "tests", "keycache");
  const { env } = Deno;

  env.set("XDG_CACHE_HOME", cacheDir);
  const keysClass = new Keys(Configuration.defaults, {});

  const instanceId = "test-instance";
  await keysClass.save(instanceId, TEST_KEY);

  const cachePath = join(cacheDir, "awssh", "keys.yaml");
  const exists = await checkFileExists(cachePath);

  assertEquals(exists, true);

  const expected = {
    [instanceId]: TEST_KEY,
  };

  let cache = await keysClass.read();
  assertEquals(cache, expected);

  await Keys.wipe();

  cache = await keysClass.read();
  assertEquals(cache, {});

  await Deno.remove(cacheDir, { recursive: true });
});

Deno.test("Non-key files throw failures", async () => {
  const keysClass = new Keys(Configuration.defaults, {});

  const indexFile = join(Deno.cwd(), "index.ts");

  const output = await keysClass.isFileKey(indexFile);

  assertEquals(output, false);
});
