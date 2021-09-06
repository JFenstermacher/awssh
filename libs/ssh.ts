import { Instances } from "./instances.ts";
import { Keys } from "./keys.ts";
import {
  Configuration,
  ConnectionTypes,
  FormattedInstance,
  Key,
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
    console.log(`Command: ${cmd.join(" ")}`);

    if (this.options.dryRun) return false;

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
      this.config.baseCommand,
      ...options,
      "-i",
      key.location,
      "-l",
      this.options.loginName,
      "-p",
      this.options.port,
      hostname,
    ] as string[];

    return command;
  }

  generateSCPCommand(instance: FormattedInstance, key: Key) {
    const hostname = this.getHost(instance) as string;

    const options = this.options.option?.map((opt) => `-o ${opt}`) || [];
  }

  getHost(instance: FormattedInstance) {
    const hosts = this.config.connectVia.reduce((res, connType) => {
      const mapping = {
        [ConnectionTypes.PRIVATE]: instance.PrivateIpAddress,
        [ConnectionTypes.PUBLIC]: instance.PublicIpAddress,
        [ConnectionTypes.SSM]: instance.InstanceId,
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
