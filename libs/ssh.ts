import { basename } from "https://deno.land/std@0.101.0/path/mod.ts";
import { Instances } from "./instances.ts";
import { Keys } from "./keys.ts";
import {
  Configuration,
  ConnectionTypes,
  FormattedInstance,
  Key,
  SCPFile,
  SSHOptions,
} from "./types.ts";

export class SSH {
  config: Configuration;
  options: SSHOptions;
  instances: Instances;
  keys: Keys;

  constructor(config: Configuration, options: SSHOptions) {
    this.config = config;
    this.options = options;
    this.instances = new Instances(config, options);
    this.keys = new Keys(config, options);
  }

  async getInstances() {
    return this.instances.get();
  }

  async promptInstances(instances: FormattedInstance[]) {
    return this.instances.prompt(instances);
  }

  async getKeys() {
    return this.keys.get();
  }

  async promptKey(instance: FormattedInstance, keys: Key[]) {
    return this.keys.prompt(instance, keys);
  }

  async run(instance: FormattedInstance, key: Key) {
    const cmd = this.generateSSHCommand(instance, key);
    const success = await this.runCmd(cmd, this.options.dryRun);

    return success;
  }

  async copy(
    instance: FormattedInstance,
    key: Key,
    source: SCPFile,
    destination: SCPFile,
  ) {
    const cmd = this.generateSCPCommand(instance, key, source, destination);
    const success = await this.runCmd(cmd, this.options.dryRun);

    return success;
  }

  async runCmd(cmd: string[], dryRun?: boolean) {
    console.log(`Command: ${cmd.join(" ")}`);

    if (dryRun) return false;

    const process = Deno.run({ cmd });

    const { success } = await process.status()
      .catch(() => ({ success: false }));

    Deno.close(process.rid);

    return success;
  }

  async saveInstances(instances: FormattedInstance[]) {
    return this.instances.save(instances);
  }

  async saveKey(instance: FormattedInstance, key: Key) {
    return this.keys.save(instance.InstanceId as string, key);
  }

  generateSSHCommand(instance: FormattedInstance, key: Key) {
    const hostname = this.getHost(instance) as string;

    const options = this.options.option?.map((opt) => `-o ${opt}`) || [];

    const command = [
      "ssh",
      this.config.baseCommand,
      ...options,
      "-i",
      key.location,
      "-l",
      this.options.loginName ?? this.config.username,
      "-p",
      this.options.port,
      hostname,
    ].filter((el) => el) as string[];

    return command;
  }

  async verifyPaths(source: string, destination?: string) {
    const statSafe = (filepath: string) =>
      Deno.stat(filepath)
        .catch(() => ({ isFile: false, isDirectory: false }));

    const isLocal = ({ isFile, isDirectory }: Partial<Deno.FileInfo>) =>
      isFile || isDirectory;

    const sourceStat = await statSafe(source);

    if (sourceStat.isDirectory) {
      throw Error("${source} is a directory, please specify a file instead");
    }

    const sourceFile: SCPFile = {
      path: source,
      remote: !isLocal(sourceStat),
    };

    if (sourceFile.remote) {
      if (!destination) destination = basename(source);

      const destStat = await statSafe(destination);

      if (isLocal(destStat)) {
        throw Error("Destination already exists");
      }

      const destFile: SCPFile = {
        path: destination,
        remote: false,
      };

      return [sourceFile, destFile];
    }

    if (!destination) {
      throw Error("Must specify a remote destination");
    }

    const destFile: SCPFile = {
      path: destination,
      remote: true,
    };

    return [sourceFile, destFile];
  }

  generateSCPCommand(
    instance: FormattedInstance,
    key: Key,
    source: SCPFile,
    destination: SCPFile,
  ) {
    const hostname = this.getHost(instance) as string;
    const username = this.options.loginName ?? this.config.username;

    const options = this.options.option?.map((opt) => `-o ${opt}`) || [];

    const generatePathValue = ({ path, remote }: SCPFile): string => {
      if (!remote) return path;

      return `${username}@${hostname}:${path}`;
    };

    const command = [
      "scp",
      this.config.baseCommand,
      ...options,
      "-i",
      key.location,
      "-P",
      this.options.port,
      generatePathValue(source),
      generatePathValue(destination),
    ].filter((el) => el) as string[];

    return command;
  }

  getHost(instance: FormattedInstance) {
    const hosts = this.config.connectVia.reduce((res, connType) => {
      const mapping = {
        [ConnectionTypes.PRIVATE]: instance.PrivateIpAddress,
        [ConnectionTypes.PUBLIC]: instance.PublicIpAddress,
        [ConnectionTypes.SSM]: instance.SSMEnabled
          ? instance.InstanceId
          : undefined,
      };

      res[connType] = mapping[connType];

      return res;
    }, {} as Record<ConnectionTypes, string | undefined>);

    if (this.options.pub) return hosts[ConnectionTypes.PUBLIC];
    else if (this.options.ssm) return hosts[ConnectionTypes.SSM];
    else if (this.options.priv) return hosts[ConnectionTypes.PRIVATE];

    return Object.values(hosts)
      .filter((host) => host)
      .shift();
  }
}
