import { green } from "https://deno.land/std@0.106.0/fmt/colors.ts";
import { assertEquals } from "https://deno.land/std@0.106.0/testing/asserts.ts";
import { CONFIG_DEFAULTS } from "../libs/config.ts";
import * as instances from "../libs/instances.ts";
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
  const rendered = instances.renderTemplateString(
    TEST_INSTANCES[0],
    templateString,
  );

  const expected = "i-abc [prefix-0]";
  assertEquals(rendered, expected);
});

Deno.test("Unavailable attribute remains", () => {
  const templateString = "${Testing}";
  const rendered = instances.renderTemplateString(
    TEST_INSTANCES[0],
    templateString,
  );

  const expected = "${Testing}";
  assertEquals(rendered, expected);
});

Deno.test("Nested access failure handled", () => {
  const templateString = "${Tags.Test}";
  const rendered = instances.renderTemplateString(
    TEST_INSTANCES[0],
    templateString,
  );

  const expected = "${Tags.Test}";
  assertEquals(rendered, expected);
});

Deno.test("Instance map can be generated", () => {
  const templateString = "${InstanceId} [${Tags.Name}]";

  const config = {
    ...CONFIG_DEFAULTS,
    templateString,
  };

  const instanceMap = instances.generateInstanceMap(TEST_INSTANCES, config, {});

  const expected = TEST_INSTANCES.reduce((res, instance) => {
    const rendered = instances.renderTemplateString(
      instance,
      templateString,
    );

    res[green(rendered)] = instance;

    return res;
  }, {} as InstanceMap);

  assertEquals(instanceMap, expected);
});
