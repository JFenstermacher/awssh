import { green, red } from "https://deno.land/std@0.106.0/fmt/colors.ts";
import {
  Confirm,
  Select,
} from "https://deno.land/x/cliffy@v0.19.5/prompt/mod.ts";
import {
  DescribeInstancesCommand,
  DescribeInstancesCommandInput,
  EC2Client,
  Instance,
} from "https://deno.land/x/aws_sdk@v3.23.0-1/client-ec2/mod.ts";
import {
  DescribeInstanceInformationCommand,
  DescribeInstanceInformationCommandInput,
  SSMClient,
} from "https://deno.land/x/aws_sdk@v3.23.0-1/client-ssm/mod.ts";
import { defaultProvider } from "https://deno.land/x/aws_sdk@v3.23.0-1/credential-provider-node/mod.ts";
import {
  Configuration,
  ConnectionTypes,
  FormattedInstance,
  InstanceMap,
  OfflineCacheModes,
  SSHOptions,
} from "./types.ts";
import { getCacheDirectory, readYamlSafe, writeYaml } from "./util.ts";
import { join } from "https://deno.land/std@0.101.0/node/path.ts";

export class Instances {
  config: Configuration;
  options: SSHOptions;
  cachePath: string;

  constructor(config: Configuration, options: SSHOptions) {
    this.config = config;
    this.options = options;

    const cacheDirectory = getCacheDirectory();
    this.cachePath = join(cacheDirectory, "instances.yaml");
  }

  async get() {
    const instances = await this.getInstances().catch(
      async (err) => {
        let instances: FormattedInstance[] = [];

        switch (this.config.offlineCacheMode) {
          case OfflineCacheModes.AUTO: {
            instances = await this.read();
            break;
          }

          case OfflineCacheModes.PROMPT: {
            const confirmed: boolean = await Confirm.prompt(
              "Could not query instances, use offline cache",
            );

            if (!confirmed) throw err;

            instances = await this.read();
            break;
          }

          case OfflineCacheModes.DISABLED: {
            throw err;
          }

          default: {
            const msg = [
              `Invalid offlineCacheMode, ${this.config.offlineCacheMode}, not sure how you got here.`,
              "Try resetting to defaults.",
            ].join("\n");

            throw new Error(msg);
          }
        }

        return instances;
      },
    );

    return instances;
  }

  async read(): Promise<FormattedInstance[]> {
    const instances = await readYamlSafe(this.cachePath);

    return (instances ?? []) as FormattedInstance[];
  }

  async save(instances: FormattedInstance[]) {
    await writeYaml(this.cachePath, instances);
  }

  static async wipe(instances: FormattedInstance[] = []) {
    const cacheDirectory = getCacheDirectory();
    const cachePath = join(cacheDirectory, "instances.yaml");

    await writeYaml(cachePath, instances);
  }

  async prompt(instances: FormattedInstance[]) {
    const instanceMap = this.generateInstanceMap(instances);
    const options = Object.keys(instanceMap);

    if (!options.length) {
      throw new Error("No instances available");
    }

    const instanceKey = await Select.prompt({
      message: "Choose an instance",
      options,
      search: true,
      validate: (value: string) => {
        const { State } = instanceMap[value];

        return State === "running" ?? "Please choose a running instance";
      },
    });

    return instanceMap[instanceKey];
  }

  async listInstances() {
    const { profile, region } = this.options;
    const credentialDefaultProvider = () => defaultProvider({ profile });
    const client = new EC2Client({ credentialDefaultProvider, region });

    const instances: Instance[] = [];
    const params: DescribeInstancesCommandInput = {};
    while (true) {
      const command = new DescribeInstancesCommand(params);
      const { Reservations = [], NextToken } = await client.send(command);

      for (const { Instances = [] } of Reservations) {
        instances.push(...Instances);
      }

      if (!NextToken) break;

      params.NextToken = NextToken;
    }

    return instances;
  }

  async getInventory() {
    const { profile, region } = this.options;
    const credentialDefaultProvider = () => defaultProvider({ profile });
    const client = new SSMClient({ credentialDefaultProvider, region });

    const instanceIds: Set<string> = new Set();
    const params: DescribeInstanceInformationCommandInput = {
      Filters: [{ Key: "PingStatus", Values: ["Online"] }],
    };

    while (true) {
      const command = new DescribeInstanceInformationCommand(params);

      const { InstanceInformationList = [], NextToken } = await client.send(
        command,
      );

      for (const { InstanceId } of InstanceInformationList) {
        instanceIds.add(InstanceId as string);
      }

      if (!NextToken) break;

      params.NextToken = NextToken;
    }

    return instanceIds;
  }

  formatInstance(instance: Instance, SSMEnabled: boolean): FormattedInstance {
    return {
      ImageId: instance.ImageId,
      InstanceId: instance.InstanceId,
      InstanceType: instance.InstanceType,
      KeyName: instance.KeyName,
      PrivateIpAddress: instance.PrivateIpAddress,
      PublicIpAddress: instance.PublicIpAddress,
      SubnetId: instance.SubnetId,
      VpcId: instance.VpcId,
      SSMEnabled,
      State: instance.State?.Name || "unknown",
      Tags: instance.Tags?.reduce(
        (tags, { Key, Value }) =>
          Object.assign(tags, ({ [Key as string]: Value })),
        {},
      ),
    };
  }

  renderTemplateString(instance: FormattedInstance) {
    const { templateString } = this.config;
    const regex = /\$\{([^{}]+)\}/g;

    const matches = templateString.matchAll(regex);

    // ${InstanceId} ${Tag.Name}
    // To resolve Tag.Name, have to recursively select key
    const resolveKey = (match: string, key: string) => {
      const keys = key.split(".");

      let result = instance as any;

      for (const k of keys) {
        // @ts-ignore
        result = result[k] || {};
      }

      return typeof result === "object" ? match : result;
    };

    let result = templateString;
    for (const [match, key] of matches) {
      const value = resolveKey(match, key);
      result = result.replace(match, value);
    }

    return result;
  }

  async getInstances() {
    const ssmEnabled = this.config.connectVia.includes(ConnectionTypes.SSM);

    const [instanceList, inventory] = await Promise.all([
      this.listInstances(),
      ssmEnabled ? this.getInventory() : new Set<string>(),
    ]);

    const instances: FormattedInstance[] = instanceList.map((instance) => {
      const inSSMInventory = instance.InstanceId
        ? inventory.has(instance.InstanceId)
        : false;

      return this.formatInstance(instance, inSSMInventory);
    });

    return instances;
  }

  generateInstanceMap(instances: FormattedInstance[]): InstanceMap {
    const instanceMap: InstanceMap = {};

    for (const instance of instances) {
      const pubFilter = this.options.pub && !instance.PublicIpAddress;
      const ssmFilter = this.options.ssm && !instance.SSMEnabled;

      if (pubFilter && ssmFilter) continue;

      const color = instance.State === "running" ? green : red;
      const instanceKey = this.renderTemplateString(instance);

      instanceMap[color(instanceKey)] = instance;
    }

    return instanceMap;
  }
}
