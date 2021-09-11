import { Command } from "https://deno.land/x/cliffy@v0.19.5/command/mod.ts";
import { SSHOptions } from "../libs/types.ts";
import { Configuration } from "../libs/config.ts";
import { SSH } from "../libs/ssh.ts";

export const ssh = async (options: SSHOptions) => {
  const config = await Configuration.get();

  const ssh = new SSH(config, options);
  ssh.validate();

  const instances = await ssh.instances.get();
  const instance = await ssh.instances.prompt(instances);

  const keys = await ssh.keys.get();
  const key = await ssh.keys.prompt(instance, keys);

  const succesful = await ssh.run(instance, key);

  if (succesful) {
    await Promise.all([
      ssh.instances.save(instances),
      ssh.keys.save(instance, key),
    ]);
  }
};

export const sshAction = async (options: SSHOptions) =>
  ssh(options)
    .catch((err) => {
      console.error(err.message);

      Deno.exit();
    });

export const sshCmd = new Command()
  .name("awssh")
  .option("-d, --dry-run", "Prints the command that will be run")
  .option("-i, --identity-file <identityFile:string>", "Identity file")
  .option("-l, --login-name <loginName:string>", "SSH login name")
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
