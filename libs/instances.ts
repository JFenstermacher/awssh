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
import { Configuration } from "./config.ts";

type GetClient<T> = (
  params?: { profile?: string; region?: string },
) => T;
export const getEC2Client: GetClient<EC2Client> = (
  { profile, region } = {},
) => {
  const provider = () => defaultProvider({ profile });

  return new EC2Client({ credentialDefaultProvider: provider, region });
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

export const getSSMClient: GetClient<SSMClient> = (
  { profile, region } = {},
) => {
  const provider = () => defaultProvider({ profile });

  return new SSMClient({ credentialDefaultProvider: provider, region });
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

export const getInstances = async (config: Configuration, options) => {
};
