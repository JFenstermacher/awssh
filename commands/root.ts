import { Command } from "https://deno.land/x/cliffy@v0.19.5/command/mod.ts";
import { getInstance } from "../libs/instances.ts";
import { readConfig } from "../libs/config.ts";
import { SSHOptions } from "../libs/types.ts";
import { getKey } from "../libs/keys.ts";

export const sshAction = async (options: SSHOptions) => {
  const config = await readConfig();

  const instance = await getInstance(config, options);
  const cache = await readKeysCache();
  const key = await getKey(instance, config, options);

  console.log(key);
};

export const rootCmd = new Command()
  .name("awssh")
  .option("-d, --dry-run", "Prints the command that will be run")
  .option("-i, --identity-file <identityFile:string>", "Identity file")
  .option("-l, --login-name <loginName:string>", "SSH login name", {
    default: "ec2-user",
  })
  .option("-o, --option <option:string>", "SSH options", { collect: true })
  .option("-p, --port <port:number>", "SSH port", { default: 22 })
  .option("--profile <profile:string>", "AWS profile")
  .option("--region <region:string>", "AWS region")
  .option("--priv", "Filters instances and use private IP to connect", {
    conflicts: ["pub", "ssm"],
  })
  .option("--pub", "Filters instances and uses public IP to connect", {
    conflicts: ["priv", "ssm"],
  })
  .option("--ssm", "Filters instances and use SSM to connect", {
    conflicts: ["priv", "pub"],
  }).action(sshAction);
