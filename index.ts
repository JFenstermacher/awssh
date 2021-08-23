import { rootCmd } from "./commands/root.ts";

const { options } = await rootCmd
  .parse(Deno.args);

console.log(options);
