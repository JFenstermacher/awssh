import { createHash } from "https://deno.land/std@0.101.0/hash/mod.ts";
import { basename, join } from "https://deno.land/std@0.101.0/node/path.ts";
import { assertEquals } from "https://deno.land/std@0.106.0/testing/asserts.ts";
import { Configuration } from "../libs/config.ts";
import { Keys } from "../libs/keys.ts";
import { FormattedInstance, Key } from "../libs/types.ts";
import { checkFileExists } from "./util.ts";

const INDEX_FILE = join(Deno.cwd(), "index.ts");

const TEST_KEYS: Key[] = [
  {
    name: "test-key",
    location: join(Deno.cwd(), "index.ts"),
    hash: await Deno.readTextFile(INDEX_FILE)
      .then((data) => createHash("md5").update(data).toString()),
  },
  {
    name: "test-key-1",
    location: join(Deno.cwd(), "test-key-1.pem"),
    hash: "test-hash",
  },
  {
    name: "test-key-2",
    location: join(Deno.cwd(), "test-key-2.pem"),
    hash: "test-hash",
  },
];

const TEST_INSTANCE: FormattedInstance = {
  ImageId: "ami-123",
  InstanceId: "i-abc",
  InstanceType: "t2.micro",
  KeyName: "awssh-test",
  PrivateIpAddress: "100.100.100.100",
  PublicIpAddress: "999.100.100.100",
  SubnetId: "subnet-abc",
  VpcId: "vpc-abc",
  SSMEnabled: false,
  State: "running",
  Tags: { Name: "prefix-0" },
};

Deno.test("Can write, check, and wipe cache", async () => {
  const cacheDir = join(Deno.cwd(), "libs", "keycache");
  const { env } = Deno;

  env.set("XDG_CACHE_HOME", cacheDir);
  const keysClass = new Keys(Configuration.defaults, {});

  // Saving Key
  const instanceId = "i-abc";
  await keysClass.save(instanceId, TEST_KEYS[0]);

  const cachePath = join(cacheDir, "awssh", "keys.yaml");
  const exists = await checkFileExists(cachePath);
  assertEquals(exists, true);

  const expected = {
    [instanceId]: TEST_KEYS[0],
  };

  let cache = await keysClass.read();
  assertEquals(cache, expected);

  // Checking Cache
  const cachedResult = await keysClass.checkCache(TEST_INSTANCE);
  assertEquals(cachedResult, TEST_KEYS[0]);

  // Wiping of Cache
  await Keys.wipe();

  cache = await keysClass.read();
  await Deno.remove(cacheDir, { recursive: true });

  assertEquals(cache, {});
});

Deno.test("Can list keys", async () => {
  const keysDirectory = join(Deno.cwd(), "libs", "testKeysDir");
  await Deno.mkdir(keysDirectory, { recursive: true });

  const expected = [1, 2, 3].map((el) => `test-key-${el}.pem`);

  for (const el of expected) {
    const keyPath = join(keysDirectory, el);
    await Deno.writeTextFile(keyPath, "TEST");
  }

  const config = {
    ...Configuration.defaults,
    keysDirectory: keysDirectory,
  };

  const keysClass = new Keys(config, {});
  const keys = await keysClass.listKeys();

  const keyNames = keys.map(({ name }) => name);
  await Deno.remove(keysDirectory, { recursive: true });

  assertEquals(new Set(keyNames), new Set(expected));
});

Deno.test("Can detect key by name", () => {
  const keysClass = new Keys(Configuration.defaults, {});

  const keyName = "test-key-1";

  const expected = TEST_KEYS[1];
  const result = keysClass.detectKeyByName(keyName, TEST_KEYS);

  assertEquals(result, expected);
});

Deno.test("Can format a key file", async () => {
  const keysClass = new Keys(Configuration.defaults, {});

  const indexFile = join(Deno.cwd(), "index.ts");

  const expected: Key = {
    name: basename(indexFile),
    location: indexFile,
    hash: await keysClass.hash(indexFile) as string,
  };

  const result = await keysClass.format(indexFile);

  assertEquals(result, expected);
});
