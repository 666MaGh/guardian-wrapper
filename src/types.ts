export interface Skill {
  name: string;
  group: string;
  provider: string;
  userOnly: boolean;
}

export interface Profile {
  hosts: string[];
  skills: string[];
  adhd: boolean;
  graft: boolean;
  watch: boolean;
  orchestration: boolean;
}

export interface OwnedFile {
  kind: 'file' | 'block';
  hash: string;
  original: string | null;
  block: string | null;
}

export interface Installation {
  schema: 1;
  version: string;
  profile: Profile;
  files: Record<string, OwnedFile>;
}

export interface Change {
  path: string;
  before: Buffer | null;
  after: Buffer | null;
}

export interface Plan {
  root: string;
  changes: Change[];
  installation: Installation | null;
}

export interface InitOptions {
  hosts?: string[];
  groups?: string[];
  skills?: string[];
  adhd?: boolean;
  graft?: boolean;
  watch?: boolean;
  orchestration?: boolean;
}
