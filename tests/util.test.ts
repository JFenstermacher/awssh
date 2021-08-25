import { v1 } from "https://deno.land/std@0.106.0/uuid/mod.ts";
import { assertEquals } from "https://deno.land/std@0.106.0/testing/asserts.ts";
import * as util from "../libs/util.ts";
import { join } from "https://deno.land/std@0.106.0/path/mod.ts";

Deno.test("YAML: Reading non-existent path returns null", async () => {
  const randomFile = v1.generate().toString();

  const data = await util.readYamlSafe(randomFile);

  assertEquals(data, null);
});

Deno.test("YAML: Writing and reading data", async () => {
  const randomFile = join(Deno.cwd(), v1.generate().toString());

  const data = {
    top: 1,
    nested: {
      a: 2,
      b: "three",
    },
  };

  await util.writeYaml(randomFile, data);

  const readFromFile = await util.readYamlSafe(randomFile);
  await Deno.remove(randomFile);

  assertEquals(data, readFromFile);
});
