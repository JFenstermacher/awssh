import { configureCmd, scpCmd, sshCmd } from "./commands/mod.ts";

sshCmd
  .command("configure", configureCmd)
  .command("scp", scpCmd)
  .parse(Deno.args);
