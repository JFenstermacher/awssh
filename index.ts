import { configCmd, rootCmd } from "./commands/mod.ts";

rootCmd
  .command("configure", configCmd)
  .parse(Deno.args);
