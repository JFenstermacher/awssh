export type BuildTypes = "darwin" | "linux" | "windows";

export type ConnectionTypes = "public" | "private" | "ssm";

export type Configuration = {
  baseCommand: string;
  defaultUser: string;
  keysDirectory: string;
  connectVia: ConnectionTypes[];
  templateString: string;
};

export type SSHOptions = {
  dryRun?: boolean;
  identityFile?: string;
  loginName?: string;
  option?: string[];
  port?: number;
  region?: string;
  profile?: string;
  priv?: boolean;
  pub?: boolean;
  ssm?: boolean;
};
