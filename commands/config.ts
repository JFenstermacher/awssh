import { Command } from "https://deno.land/x/cliffy@v0.19.5/command/mod.ts";
import { Configuration } from "../libs/config.ts";

export const configureCmd = new Command()
  .description("Configure your SSH and SCP options")
  .action(Configuration.prompt);
