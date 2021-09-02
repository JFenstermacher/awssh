import { green } from "https://deno.land/std@0.106.0/fmt/colors.ts";
import { assertEquals } from "https://deno.land/std@0.106.0/testing/asserts.ts";
import { Configuration } from "../libs/config.ts";
import { Instances } from "../libs/instances.ts";
import { FormattedInstance, InstanceMap } from "../libs/types.ts";

const TEST_INSTANCES: FormattedInstance[] = [
  {
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
  },
  {
    ImageId: "ami-123",
    InstanceId: "i-def",
    InstanceType: "t2.micro",
    KeyName: "awssh-test",
    PrivateIpAddress: "100.100.100.101",
    PublicIpAddress: "999.100.100.101",
    SubnetId: "subnet-abc",
    VpcId: "vpc-abc",
    SSMEnabled: false,
    State: "running",
    Tags: { Name: "prefix-1" },
  },
  {
    ImageId: "ami-123",
    InstanceId: "i-ghi",
    InstanceType: "t2.micro",
    KeyName: "awssh-test",
    PrivateIpAddress: "100.100.100.102",
    PublicIpAddress: "999.100.100.102",
    SubnetId: "subnet-abc",
    VpcId: "vpc-abc",
    SSMEnabled: false,
    State: "running",
    Tags: { Name: "prefix-2" },
  },
];

Deno.test("Template string rendering works", async () => {
  const templateString = "${InstanceId} [${Tags.Name}]";
  const config = Object.assign(Configuration.defaults, { templateString });
  const instancesClass = new Instances(config, {});

  const rendered = instancesClass.renderTemplateString(TEST_INSTANCES[0]);

  const expected = "i-abc [prefix-0]";
  assertEquals(rendered, expected);
});

Deno.test("Unavailable attribute remains", () => {
  const templateString = "${Testing}";
  const config = Object.assign(Configuration.defaults, { templateString });
  const instancesClass = new Instances(config, {});

  const rendered = instancesClass.renderTemplateString(TEST_INSTANCES[0]);

  const expected = "${Testing}";
  assertEquals(rendered, expected);
});

Deno.test("Nested access failure handled", () => {
  const templateString = "${Tags.Test}";
  const config = Object.assign(Configuration.defaults, { templateString });
  const instancesClass = new Instances(config, {});

  const rendered = instancesClass.renderTemplateString(TEST_INSTANCES[0]);

  const expected = "${Tags.Test}";
  assertEquals(rendered, expected);
});

Deno.test("Instance map can be generated", () => {
  const templateString = "${InstanceId} [${Tags.Name}]";
  const config = Object.assign(Configuration.defaults, { templateString });
  const instancesClass = new Instances(config, {});

  const instanceMap = instancesClass.generateInstanceMap(TEST_INSTANCES);

  const expected = TEST_INSTANCES.reduce((res, instance) => {
    const rendered = instancesClass.renderTemplateString(instance);

    res[green(rendered)] = instance;

    return res;
  }, {} as InstanceMap);

  assertEquals(instanceMap, expected);
});
