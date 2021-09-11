import { Base } from "./base.ts";
import { Configuration, FormattedInstance, Key, SSHOptions } from "./types.ts";

export class SSH extends Base {
  constructor(config: Configuration, options: SSHOptions) {
    super(config, options);
  }

  async run(instance: FormattedInstance, key: Key) {
    const cmd = this.generateSSHCommand(instance, key);
    const success = await this.runCmd(cmd, this.options.dryRun);

    return success;
  }

  async runCmd(cmd: string[], dryRun?: boolean) {
    console.log(`Command: ${cmd.join(" ")}`);

    if (dryRun) return false;

    const process = Deno.run({ cmd });

    const { success } = await process.status()
      .catch(() => ({ success: false }));

    Deno.close(process.rid);

    return success;
  }

  generateSSHCommand(instance: FormattedInstance, key: Key) {
    const hostname = this.getHost(instance) as string;

    const options = this.options.option?.map((opt) => `-o ${opt}`) || [];

    const command = [
      "ssh",
      this.config.baseCommand,
      ...options,
      "-i",
      key.location,
      "-l",
      this.options.loginName ?? this.config.username,
      "-p",
      this.options.port,
      hostname,
    ].filter((el) => el) as string[];

    return command;
  }
}
