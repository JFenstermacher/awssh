export const checkFileExists = async (filepath: string) =>
  Deno
    .stat(filepath)
    .then(() => true)
    .catch(() => false);
