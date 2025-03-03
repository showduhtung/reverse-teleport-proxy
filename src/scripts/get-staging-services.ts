import { mkdir, writeFile, readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { execAsync } from "../lib/process.js";
import { services } from "../common/constants.js";

export type ApplicationServiceSchema = {
  kind: "app";
  version: "v3";
  metadata: {
    name: string;
    description: string;
    labels: {
      [key: string]: string;
      environment: string;
      "agent-host": "siaec-staging-lwit" | "workplace-staging-yzjy";
    };
    id: number;
    revision: string;
  };
  spec: {
    uri: string;
    public_addr: string;
    insecure_skip_verify: boolean;
  };
};

const CACHE_DIR = ".cache";
const STAGING_APPS_CACHE_FILE = "staging-apps-cache.json";

// const stagings = ["workplace-staging-yzjy", "siaec-staging-lwit"];

export async function getStagingServices() {
  console.log("--- Starting getStagingServices...");
  try {
    const cachePath = join(CACHE_DIR, STAGING_APPS_CACHE_FILE);
    if (!existsSync(CACHE_DIR)) {
      console.log("Creating cache directory...");
      await mkdir(CACHE_DIR, { recursive: true });
    }

    console.log("Fetching applications from Teleport...");
    const { stdout } = await execAsync("tsh app ls --format=json");
    const parsed = JSON.parse(stdout) as ApplicationServiceSchema[];
    console.log(`Found ${parsed.length} total applications`);

    const apps = parsed.filter((app) => {
      const { labels, name } = app.metadata;
      const isMatchingService = services.some(({ service }) =>
        name.includes(service)
      );
      const isStaging = labels.environment === "staging";
      // const isYZJY = labels["agent-host"] === "workplace-staging-yzjy";
      const isLWIT = labels["agent-host"] === "siaec-staging-lwit";

      // return isMatchingService && isStaging && isYZJY;
      return isMatchingService && isStaging && isLWIT;
    });
    console.log(`Filtered to ${apps.length} matching applications`);

    if (!existsSync(cachePath)) {
      console.log("No cache file found, creating initial cache...");
      await writeFile(cachePath, JSON.stringify(apps, null, 2));
      return;
    }

    console.log("Reading existing cache...");
    const data = await readFile(cachePath, "utf-8");
    const cachedData = JSON.parse(data);
    const isSame = JSON.stringify(cachedData) === JSON.stringify(apps);

    if (!isSame) {
      console.log("Cache differs from current data, updating cache...");
      await writeFile(cachePath, JSON.stringify(apps, null, 2));
    } else {
      console.log("Cache is up to date, no changes needed");
    }
  } catch (err) {
    console.error("Failed to cache apps:", err);
    if (err instanceof Error) {
      console.error("Error details:", {
        message: err.message,
        stack: err.stack,
      });
    }
    throw err;
  }
}
