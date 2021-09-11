import { join } from "https://deno.land/std@0.101.0/path/mod.ts";
import { assertEquals } from "https://deno.land/std@0.101.0/testing/asserts.ts";
import { Configuration } from "./config.ts";
import { SSH } from "./ssh.ts";
import { ConnectionTypes, FormattedInstance, SCPFile } from "./types.ts";

const __dirname = new URL(".", import.meta.url).pathname;

const TEST_INSTANCE: FormattedInstance = {
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
};

const TEST_KEY = {
  name: "test-key-1",
  location: join(__dirname, "..", "test-key-1.pem"),
  hash: "test-hash",
};

Deno.test("SSH: Basic command generation tested", async () => {
  let ssh = new SSH(Configuration.defaults, { port: 22 });

  const cmd = ssh.generateSSHCommand(TEST_INSTANCE, TEST_KEY);

  const expected = [
    "ssh",
    "-i",
    TEST_KEY.location,
    "-l",
    Configuration.defaults.username,
    "-p",
    22,
    TEST_INSTANCE.PublicIpAddress,
  ];

  assertEquals(cmd, expected);
});

Deno.test("SSH: Generate base command with different configurations", async () => {
  const config = {
    ...Configuration.defaults,
    baseCommand: "-o StrictHostKeyChecking=no",
    username: "test-user",
  };

  const ssh = new SSH(config, { port: 22 });

  const cmd = ssh.generateSSHCommand(TEST_INSTANCE, TEST_KEY);

  const expected = [
    "ssh",
    config.baseCommand,
    "-i",
    TEST_KEY.location,
    "-l",
    config.username,
    "-p",
    22,
    TEST_INSTANCE.PublicIpAddress,
  ];

  assertEquals(cmd, expected);
});

Deno.test("SSH: Get appropriate host based on configuration and options", async () => {
  const ssh = new SSH(Configuration.defaults, {});
  const hostname = ssh.getHost(TEST_INSTANCE);
  assertEquals(hostname, TEST_INSTANCE.PublicIpAddress);
});

Deno.test("SSH: Private flag should return private IP from host", async () => {
  const ssh = new SSH(Configuration.defaults, { priv: true });
  const hostname = ssh.getHost(TEST_INSTANCE);
  assertEquals(hostname, TEST_INSTANCE.PrivateIpAddress);
});

Deno.test("SSH: ssm flag should return instanceId from host", async () => {
  const config = {
    ...Configuration.defaults,
    connectVia: [
      ConnectionTypes.SSM,
      ConnectionTypes.PRIVATE,
      ConnectionTypes.PUBLIC,
    ],
  };

  const instance: FormattedInstance = {
    ...TEST_INSTANCE,
    SSMEnabled: true,
  };

  const ssh = new SSH(config, { ssm: true });
  const hostname = ssh.getHost(instance);
  assertEquals(hostname, TEST_INSTANCE.InstanceId);
});

Deno.test("SSH: first configured connection type returned", async () => {
  const config = {
    ...Configuration.defaults,
    connectVia: [ConnectionTypes.PRIVATE, ConnectionTypes.PUBLIC],
  };

  const ssh = new SSH(config, {});
  const hostname = ssh.getHost(TEST_INSTANCE);
  assertEquals(hostname, TEST_INSTANCE.PrivateIpAddress);
});

Deno.test("SSH: last option will be returned if first two are undefined", async () => {
  const config = {
    ...Configuration.defaults,
    connectVia: [
      ConnectionTypes.SSM,
      ConnectionTypes.PUBLIC,
      ConnectionTypes.PRIVATE,
    ],
  };

  const instance: FormattedInstance = {
    ...TEST_INSTANCE,
    PublicIpAddress: undefined,
  };

  const ssh = new SSH(config, {});
  const hostname = ssh.getHost(instance);
  assertEquals(hostname, TEST_INSTANCE.PrivateIpAddress);
});
