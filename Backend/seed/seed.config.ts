export interface SeedConfig {
  failFast: boolean;
  logProgress: boolean;
}

export const DEFAULT_SEED_CONFIG: SeedConfig = {
  failFast: true,
  logProgress: true,
};
