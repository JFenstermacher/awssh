import { green, red } from "https://deno.land/std@0.106.0/fmt/colors.ts";
import { Select } from "https://deno.land/x/cliffy@v0.19.5/prompt/mod.ts";
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
  ClientParams,
  Configuration,
  FormattedInstance,
  InstanceMap,
  SSHOptions,
} from "./types.ts";

export const getClients = (
  { profile, region }: ClientParams = {},
): [EC2Client, SSMClient] => {
  const credentialDefaultProvider = () => defaultProvider({ profile });
  const ec2 = new EC2Client({ credentialDefaultProvider, region });
  const ssm = new SSMClient({ credentialDefaultProvider, region });

  return [ec2, ssm];
};

export const listInstances = async (client: EC2Client) => {
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
};

export const getInventory = async (client: SSMClient) => {
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
};

export const formatInstance = (
  instance: Instance,
  SSMEnabled: boolean,
): FormattedInstance => ({
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
    (tags, { Key, Value }) => Object.assign(tags, ({ [Key as string]: Value })),
    {},
  ),
});

export const getInstances = async (
  config: Configuration,
  options: SSHOptions,
) => {
  const [ec2, ssm] = getClients(options);
  const ssmEnabled = config.connectVia.includes("ssm");

  const [instanceList, inventory] = await Promise.all([
    listInstances(ec2),
    ssmEnabled ? getInventory(ssm) : new Set<string>(),
  ]);

  const instances: FormattedInstance[] = instanceList.map((instance) => {
    const inSSMInventory = instance.InstanceId
      ? inventory.has(instance.InstanceId)
      : false;

    return formatInstance(instance, inSSMInventory);
  });

  return instances;
};

export const renderTemplateString = (
  instance: FormattedInstance,
  templateString: string,
) => {
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
};

export const generateInstanceMap = (
  instances: FormattedInstance[],
  { templateString }: Configuration,
  { pub, ssm }: SSHOptions,
): InstanceMap => {
  const instanceMap: InstanceMap = {};

  for (const instance of instances) {
    const pubFilter = pub && !instance.PublicIpAddress;
    const ssmFilter = ssm && !instance.SSMEnabled;

    if (pubFilter && ssmFilter) continue;

    const color = instance.State === "running" ? green : red;
    const instanceKey = renderTemplateString(instance, templateString);

    instanceMap[color(instanceKey)] = instance;
  }

  return instanceMap;
};

export const promptInstance = async (
  instances: FormattedInstance[],
  config: Configuration,
  sshOptions: SSHOptions,
) => {
  const instanceMap = generateInstanceMap(instances, config, sshOptions);
  const options = Object.keys(instanceMap);

  if (!options.length) return null;

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
};
