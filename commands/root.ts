import { Command } from "https://deno.land/x/cliffy@v0.19.5/command/mod.ts";

export const rootCmd = new Command()
  .name("awssh")
  .option("-d, --dry-run", "Prints the command that will be run", {
    global: true,
  })
  .option("-i, --identity-file <identityFile:string>", "Identity file")
  .option("-l, --login-name <loginName:string>", "SSH login name", {
    default: "ec2-user",
  })
  .option("-o, --option <option:string>", "SSH options", {
    global: true,
    collect: true,
  })
  .option("-p, --port <port:number>", "SSH port", { global: true, default: 22 })
  .option("--profile <profile:string>", "AWS profile", { global: true })
  .option("--region <region:string>", "AWS region", { global: true })
  .option("--priv", "Use private IP to connect to instance", {
    conflicts: ["pub", "ssm"],
    global: true,
  })
  .option("--pub", "Use public IP to connect to instance", {
    conflicts: ["priv", "ssm"],
    global: true,
  })
  .option("--ssm", "Use SSM to connect", {
    conflicts: ["priv", "pub"],
    global: true,
  });
