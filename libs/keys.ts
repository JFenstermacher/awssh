import { createHash } from "https://deno.land/std@0.101.0/hash/mod.ts";
import {
  join,
  parse,
  resolve,
} from "https://deno.land/std@0.101.0/node/path.ts";
import { Select } from "https://deno.land/x/cliffy@v0.19.5/prompt/select.ts";
import {
  Configuration,
  FormattedInstance,
  Key,
  KeyCache,
  SSHOptions,
} from "./types.ts";
import {
  getCacheDirectory,
  isExecutable,
  readYamlSafe,
  writeYaml,
} from "./util.ts";

export class Keys {
  config: Configuration;
  options: SSHOptions;
  cachePath: string;
  cache: KeyCache = {};

  constructor(config: Configuration, options: SSHOptions) {
    this.config = config;
    this.options = options;

    const cacheDirectory = getCacheDirectory();
    this.cachePath = join(cacheDirectory, "keys.yaml");
  }

  async get() {
    const [keys, cache] = await Promise.all([
      this.listKeys(),
      this.read(),
    ]);

    this.cache = cache;

    return keys;
  }

  async prompt(instance: FormattedInstance, keys: Key[]): Promise<Key> {
    const { identityFile } = this.options;
    if (identityFile) return this.format(identityFile);

    const cacheKey = await this.checkCache(instance);
    if (cacheKey) return cacheKey;

    // If keyPair name matches PEM -> keypair = dev-keypair : PEM = dev-keypair.pem
    const namedKey = this.detectKeyByName(instance.KeyName as string, keys);
    if (namedKey) return namedKey;

    const options = keys.map(({ name }, index) => ({
      name,
      value: index.toString(),
    }));

    const index = await Select.prompt({
      message: "Choose an identity file",
      options,
      search: true,
    });

    return keys[parseInt(index)];
  }

  async read(): Promise<KeyCache> {
    const keys = await readYamlSafe(this.cachePath);

    return (keys ?? {}) as KeyCache;
  }

  async save(instanceId: string, key: Key) {
    this.cache[instanceId] = key;

    await writeYaml(this.cachePath, this.cache);
  }

  static async wipe(cache: KeyCache = {}) {
    const cacheDirectory = getCacheDirectory();
    const cachePath = join(cacheDirectory, "keys.yaml");

    await writeYaml(cachePath, cache);
  }

  async listKeys(): Promise<Key[]> {
    const { keysDirectory } = this.config;
    const files = Deno.readDir(keysDirectory);

    const keygenExists = await isExecutable("ssh-keygen");
    const check = keygenExists ? this.isFileKey : async (_: string) => true;

    const keys: Key[] = [];
    for await (const { name } of files) {
      const fullpath = join(keysDirectory, name);
      const isKey = await check(fullpath);

      if (isKey) {
        const key = await this.format(fullpath);

        keys.push(key);
      }
    }

    return keys;
  }

  async format(path: string): Promise<Key> {
    const { name } = parse(path);
    const hash = await this.hash(path);

    if (!hash) {
      throw new Error(`Key file ${path} doesn't exist`);
    }

    return {
      name,
      location: resolve(path),
      hash,
    };
  }

  async hash(path: string) {
    const contents = await Deno.readTextFile(path).catch((_) => null);

    const hash = createHash("md5");

    return contents ? hash.update(contents).toString() : null;
  }

  async isFileKey(path: string) {
    const process = Deno.run({
      cmd: ["ssh-keygen", "-l", "-f", path],
      stdout: "null",
      stderr: "null",
      stdin: "null",
    });

    const { success } = await process.status()
      .catch(() => ({ success: false }));

    Deno.close(process.rid);

    return success;
  }

  async checkCache(instance: FormattedInstance): Promise<Key | null> {
    const entry = this.cache[instance.InstanceId as string] || {};
    if (!entry.location) return null;

    // Checking whether file has been renamed / moved
    // If the current hash at the location of the file is equal to the previous hash, then must be same file
    // Instance IDs are unique, so if instanceID is represented in cache, and hashes match, key is good to use
    const currentHash = await this.hash(entry.location);

    return currentHash === entry.hash ? entry : null;
  }

  detectKeyByName(keyName: string, keys: Key[]) {
    return keys.find((key) => {
      const { name } = parse(key.name);

      return name === keyName;
    });
  }
}
