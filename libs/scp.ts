import { basename } from "https://deno.land/std@0.101.0/path/mod.ts";
import { Base } from "./base.ts";
import {
  Configuration,
  FormattedInstance,
  Key,
  SCPFile,
  SSHOptions,
} from "./types.ts";

export class SCP extends Base {
  constructor(config: Configuration, options: SSHOptions) {
    super(config, options);
  }

  async copy(
    instance: FormattedInstance,
    key: Key,
    source: SCPFile,
    destination: SCPFile,
  ) {
    const cmd = this.generateCommand(instance, key, source, destination);
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

  async verifyPaths(source: string, destination?: string) {
    const statSafe = (filepath: string) =>
      Deno.stat(filepath)
        .catch(() => ({ isFile: false, isDirectory: false }));

    const isLocal = ({ isFile, isDirectory }: Partial<Deno.FileInfo>) =>
      isFile || isDirectory;

    const sourceStat = await statSafe(source);

    const sourceFile: SCPFile = {
      directory: sourceStat.isDirectory,
      path: source,
      remote: !isLocal(sourceStat),
    };

    if (sourceFile.remote) {
      if (!destination) destination = basename(source);

      const destStat = await statSafe(destination);

      if (isLocal(destStat)) {
        throw Error("Destination already exists");
      }

      const destFile: SCPFile = {
        path: destination,
        remote: false,
      };

      return [sourceFile, destFile];
    }

    if (!destination) {
      throw Error("Must specify a remote destination");
    }

    const destFile: SCPFile = {
      path: destination,
      remote: true,
    };

    return [sourceFile, destFile];
  }

  generateCommand(
    instance: FormattedInstance,
    key: Key,
    source: SCPFile,
    destination: SCPFile,
  ) {
    const hostname = this.getHost(instance) as string;
    const username = this.options.loginName ?? this.config.username;

    const options = this.options.option?.map((opt) => `-o ${opt}`) || [];

    const generatePathValue = ({ path, remote }: SCPFile): string => {
      if (!remote) return path;

      return `${username}@${hostname}:${path}`;
    };

    const command = [
      "scp",
      this.config.baseCommand,
      ...options,
      "-i",
      key.location,
      "-P",
      this.options.port,
      generatePathValue(source),
      generatePathValue(destination),
    ].filter((el) => el) as string[];

    return command;
  }
}
