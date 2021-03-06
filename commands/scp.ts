import { Command } from "https://deno.land/x/cliffy@v0.19.5/command/mod.ts";
import { Configuration } from "../libs/config.ts";
import { SCP } from "../libs/scp.ts";
import { SSHOptions } from "../libs/types.ts";

export const scp = async (
  options: SSHOptions,
  source: string,
  destination?: string,
) => {
  const config = await Configuration.get();

  const scp = new SCP(config, options);
  scp.validate();

  const [sourceFile, destinationFile] = await scp.verifyPaths(
    source,
    destination,
  );

  const instances = await scp.instances.get();
  const instance = await scp.instances.prompt(instances);

  const keys = await scp.keys.get();
  const key = await scp.keys.prompt(instance, keys);

  const succesful = await scp.copy(instance, key, sourceFile, destinationFile);

  if (succesful) {
    await Promise.all([
      scp.instances.save(instances),
      scp.keys.save(instance, key),
    ]);
  }
};

export const scpAction = async (
  options: SSHOptions,
  source: string,
  destination?: string,
) =>
  scp(options, source, destination)
    .catch((err) => {
      console.error(err.message);

      Deno.exit();
    });

export const scpCmd = new Command()
  .description("Use SCP to transfer a file")
  .arguments("<source:string> [destination:string]")
  .action(scpAction)
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
  });
