import {
  assertEquals,
  assertThrowsAsync,
} from "https://deno.land/std@0.106.0/testing/asserts.ts";
import { Input } from "https://deno.land/x/cliffy@v0.19.5/prompt/mod.ts";
import { v1 } from "https://deno.land/std@0.106.0/uuid/mod.ts";
import { Configuration } from "../libs/config.ts";

Deno.test("Config path can be set via env var", async () => {
  Deno.env.set("XDG_CONFIG_HOME", Deno.cwd());

  const configPath = Configuration.getConfigPath();

  assertEquals(configPath, `${Deno.cwd()}/awssh/config.yaml`);
});

Deno.test("Can configure base command", async () => {
  console.log();

  const newCommand = "ssh-whatever";
  Input.inject(newCommand);

  const result = await Configuration.configureCommand(Configuration.defaults);

  assertEquals(result.baseCommand, newCommand);
});

Deno.test("Can configure keys home", async () => {
  console.log();

  const newDir = Deno.cwd();
  Input.inject(newDir);

  const result = await Configuration.configureKeysHome(Configuration.defaults);

  assertEquals(result.keysDirectory, newDir);
});

Deno.test("Configuring keys home will fail when pased not a directory", async () => {
  console.log();

  const newDir = v1.generate().toString();
  const fn = async () => {
    Input.inject(newDir);

    await Configuration.configureKeysHome(Configuration.defaults);
  };

  await assertThrowsAsync(fn, Error, "Please provide a valid directory");
});

Deno.test("Can configure template", async () => {
  console.log();

  const newTemplateString = "${Instance.Id}";
  Input.inject(newTemplateString);

  const result = await Configuration.configureTemplate(Configuration.defaults);
  assertEquals(result.templateString, newTemplateString);
});
