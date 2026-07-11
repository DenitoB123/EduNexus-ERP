/**
 * Maps a platform capability flag to the module class name that
 * provides it, so PlatformMetadataService can report capabilities by
 * actually checking what's registered (via ModuleDiscoveryService)
 * rather than hard-coding "yes" for things that might not be wired up
 * in a given deployment profile.
 */
export const CAPABILITY_MODULE_MAP: Record<string, string> = {
  cache: 'CacheModule',
  queue: 'JobModule',
  scheduler: 'SchedulerModule',
  eventBus: 'EventModule',
  storage: 'StorageModule',
  email: 'EmailModule',
  sms: 'SmsModule',
  push: 'PushModule',
};
