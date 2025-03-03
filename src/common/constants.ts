export const CACHE_DIR = ".cache";
export const STAGING_APPS_CACHE_FILE = "staging-apps-cache.json";
export const LATEST_DAY_FETCHED_AT = "latest-day.text";
export const services = [
  { service: "camera", endpoint: "cameras" },
  { service: "location", endpoint: "locations" },
  { service: "user", endpoint: "users" },
  { service: "job", endpoint: "jobs" },
  { service: "zone-video", endpoint: "zone-videos" },
  { service: "deviation", endpoint: "deviations" },
] as const;
