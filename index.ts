import { configureCmd, sshCmd } from "./commands/mod.ts";

sshCmd
  .command("configure", configureCmd)
  .parse(Deno.args);
