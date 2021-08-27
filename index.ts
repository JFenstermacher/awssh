import { configureCmd, rootCmd } from "./commands/mod.ts";

rootCmd
  .command("configure", configureCmd)
  .parse(Deno.args);
