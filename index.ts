// import { configureCmd, rootCmd } from "./commands/mod.ts";

// rootCmd
//   .command("configure", configureCmd)
//   .parse(Deno.args);

try {
  const process = Deno
    .run({
      cmd: ["ssh-keygen", "-l", "-f", "index.ts"],
      stdout: "null",
      stderr: "null",
    });

  const { success } = await process.status();
  console.log(success);
} catch (err) {
  console.log(err);
}
