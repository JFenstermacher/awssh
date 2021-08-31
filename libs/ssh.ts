import { Instances } from "./instances.ts";
import { Keys } from "./keys.ts";
import {
  Configuration,
  ConnectionTypes,
  FormattedInstance,
  Key,
  SSHOptions,
} from "./types.ts";

export class SSHCP {
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

  generateCommand(instance: FormattedInstance, key: Key) {
    let hostname = this.getHost(instance) as string;

    const options = this.options.option?.map((opt) => `-o ${opt}`) || [];

    const command = [
      this.config.baseCommand,
      ...options,
      "-l",
      this.options.loginName,
      "-p",
      this.options.port,
      hostname,
    ].join(" ");

    return command;
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
