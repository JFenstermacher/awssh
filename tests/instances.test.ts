import { join } from "https://deno.land/std@0.101.0/node/path.ts";
import { green } from "https://deno.land/std@0.106.0/fmt/colors.ts";
import { assertEquals } from "https://deno.land/std@0.106.0/testing/asserts.ts";
import { Instance } from "https://deno.land/x/aws_sdk@v3.23.0-1/client-ec2/mod.ts";
import { Select } from "https://deno.land/x/cliffy@v0.19.5/prompt/select.ts";
import { Configuration } from "../libs/config.ts";
import { Instances } from "../libs/instances.ts";
import { FormattedInstance, InstanceMap } from "../libs/types.ts";
import { readYamlSafe } from "../libs/util.ts";
import { checkFileExists } from "./utilities.ts";

const UNFORMATTED_INSTANCE: Instance = {
  ImageId: "ami-123",
  InstanceId: "i-abc",
  InstanceType: "t2.micro",
  KeyName: "awssh-test",
  PrivateIpAddress: "100.100.100.100",
  PublicIpAddress: "999.100.100.100",
  SubnetId: "subnet-abc",
  VpcId: "vpc-abc",
  State: {
    Name: "running",
  },
  Tags: [
    {
      Key: "Name",
      Value: "prefix-0",
    },
  ],
};

const FORMATTED_INSTANCES: FormattedInstance[] = [
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
  const config = { ...Configuration.defaults, templateString };
  const instancesClass = new Instances(config, {});

  const rendered = instancesClass.renderTemplateString(FORMATTED_INSTANCES[0]);

  const expected = "i-abc [prefix-0]";
  assertEquals(rendered, expected);
});

Deno.test("Unavailable attribute remains", () => {
  const templateString = "${Testing}";
  const config = { ...Configuration.defaults, templateString };
  const instancesClass = new Instances(config, {});

  const rendered = instancesClass.renderTemplateString(FORMATTED_INSTANCES[0]);

  const expected = "${Testing}";
  assertEquals(rendered, expected);
});

Deno.test("Nested access failure handled", () => {
  const templateString = "${Tags.Test}";
  const config = { ...Configuration.defaults, templateString };
  const instancesClass = new Instances(config, {});

  const rendered = instancesClass.renderTemplateString(FORMATTED_INSTANCES[0]);

  const expected = "${Tags.Test}";
  assertEquals(rendered, expected);
});

Deno.test("Instance map can be generated", () => {
  const templateString = "${InstanceId} [${Tags.Name}]";
  const config = { ...Configuration.defaults, templateString };
  const instancesClass = new Instances(config, {});

  const instanceMap = instancesClass.generateInstanceMap(FORMATTED_INSTANCES);

  const expected = FORMATTED_INSTANCES.reduce((res, instance) => {
    const rendered = instancesClass.renderTemplateString(instance);

    res[green(rendered)] = instance;

    return res;
  }, {} as InstanceMap);

  assertEquals(instanceMap, expected);
});

Deno.test("Can format an instance", () => {
  const expected = FORMATTED_INSTANCES[0];

  const instancesClass = new Instances(Configuration.defaults, {});
  const formatted = instancesClass.formatInstance(UNFORMATTED_INSTANCE, false);

  assertEquals(expected, formatted);
});

Deno.test("Can prompt for an instance", async () => {
  const expected = FORMATTED_INSTANCES[1];

  const instancesClass = new Instances(Configuration.defaults, {});
  const key = instancesClass.renderTemplateString(expected);

  Select.inject(green(key));
  const selected = await instancesClass.prompt(FORMATTED_INSTANCES);

  assertEquals(selected, expected);
});

Deno.test("Cache can be written and wiped", async () => {
  const cacheDir = join(Deno.cwd(), "tests", "cache");
  Deno.env.set("XDG_CACHE_HOME", cacheDir);

  const instancesClass = new Instances(Configuration.defaults, {});
  await instancesClass.save(FORMATTED_INSTANCES);
  const cachePath = join(cacheDir, "awssh", "instances.yaml");

  let exists = await checkFileExists(cachePath);
  assertEquals(exists, true);
  await Instances.wipe();

  const data = await readYamlSafe(cachePath);
  assertEquals(data, []);

  await Deno.remove(cacheDir, { recursive: true });
});
