import { Instances } from "./instances.ts";
import { Keys } from "./keys.ts";
import { throwErrorMessages } from "./util.ts";
import {
  Configuration,
  ConnectionTypes,
  FormattedInstance,
  SSHOptions,
} from "./types.ts";

export class Base {
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

  validate() {
    const { ssm } = this.options;

    if (!ssm) return;

    if (!this.config.connectVia.includes(ConnectionTypes.SSM)) {
      throwErrorMessages([
        "session-manager-plugin not detected on PATH",
        "Please install and configure",
      ]);
    }

    return;
  }
}
