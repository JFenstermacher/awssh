export type BuildTypes = "darwin" | "linux" | "windows";

export enum ConnectionTypes {
  PUBLIC = "public",
  PRIVATE = "private",
  SSM = "ssm",
}
export enum OfflineCacheModes {
  AUTO = "auto",
  PROMPT = "prompt",
  DISABLED = "disabled",
}

export type Configuration = {
  baseCommand: string;
  defaultUser: string;
  keysDirectory: string;
  connectVia: ConnectionTypes[];
  templateString: string;
  offlineCacheMode: OfflineCacheModes;
  username: string;
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

export type ClientParams = {
  profile?: string;
  region?: string;
};

export type FormattedInstance = {
  ImageId?: string;
  InstanceId?: string;
  InstanceType?: string;
  KeyName?: string;
  PrivateIpAddress?: string;
  PublicIpAddress?: string;
  SubnetId?: string;
  VpcId?: string;
  SSMEnabled: boolean;
  State: string;
  Tags?: { [key: string]: string };
};

export enum CacheTypes {
  Instances = "instances",
  Keys = "keys",
}

export type InstanceMap = {
  [key: string]: FormattedInstance;
};

export type Key = {
  name: string;
  location: string;
  hash: string;
};

export type KeyCache = {
  [instanceId: string]: Key;
};

export type SCPFile = {
  path: string;
  remote: boolean;
};
