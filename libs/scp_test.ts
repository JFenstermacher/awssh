import { join } from "https://deno.land/std@0.101.0/path/mod.ts";
import {
  assertEquals,
  assertThrowsAsync,
} from "https://deno.land/std@0.101.0/testing/asserts.ts";
import { SCPFile } from "./types.ts";
import { Configuration } from "./config.ts";
import { SCP } from "./scp.ts";

const __dirname = new URL(".", import.meta.url).pathname;

const INDEX_FILE = join(__dirname, "..", "index.ts");

Deno.test("SCP: Source is local, and destination is not given", async () => {
  const ssh = new SCP(Configuration.defaults, {});

  assertThrowsAsync(
    async () => ssh.verifyPaths(INDEX_FILE),
    Error,
    "Must specify a remote destination",
  );
});

Deno.test("SCP: Source is local, destination given, and is file", async () => {
  const ssh = new SCP(Configuration.defaults, {});

  const remotePath = "/tmp/awsshtest/index.ts";

  const scpFiles = await ssh.verifyPaths(INDEX_FILE, remotePath);

  const expected: [SCPFile, SCPFile] = [
    {
      directory: false,
      path: INDEX_FILE,
      remote: false,
    },
    {
      path: remotePath,
      remote: true,
    },
  ];

  assertEquals(scpFiles, expected);
});

Deno.test("SCP: Source is remote, destination not given, and basename exists in current directory", async () => {
  const ssh = new SCP(Configuration.defaults, {});

  const remotePath = "/tmp/awsshtest/index.ts";

  assertThrowsAsync(
    async () => ssh.verifyPaths(remotePath),
    Error,
    "Destination already exists",
  );
});

Deno.test("SCP: Source is remote, destination not given, and basename doesn't exist", async () => {
  const ssh = new SCP(Configuration.defaults, {});

  Deno.chdir("libs");

  const remotePath = "/tmp/awsshtest/index.ts";
  const scpFiles = await ssh.verifyPaths(remotePath);

  const expected: [SCPFile, SCPFile] = [
    {
      directory: false,
      path: remotePath,
      remote: true,
    },
    {
      path: "index.ts",
      remote: false,
    },
  ];

  Deno.chdir("..");

  assertEquals(scpFiles, expected);
});

Deno.test("SCP: Source is remote, destination given, but exists", async () => {
  const ssh = new SCP(Configuration.defaults, {});

  const remotePath = "/tmp/awsshtest/index.ts";

  assertThrowsAsync(
    async () => ssh.verifyPaths(remotePath, INDEX_FILE),
    Error,
    "Destination already exists",
  );
});

Deno.test("SCP: Source is remote, destination given", async () => {
  const ssh = new SCP(Configuration.defaults, {});

  Deno.chdir("libs");

  const remotePath = "/tmp/awsshtest/index.ts";

  const scpFiles = await ssh.verifyPaths(remotePath, "bleh.ts");

  const expected: [SCPFile, SCPFile] = [
    {
      directory: false,
      path: remotePath,
      remote: true,
    },
    {
      path: "bleh.ts",
      remote: false,
    },
  ];

  assertEquals(scpFiles, expected);
});
