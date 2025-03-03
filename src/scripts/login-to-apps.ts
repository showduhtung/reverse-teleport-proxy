import { existsSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { execAsync } from "../lib/process.js";
import type { ApplicationServiceSchema } from "./get-staging-services.js";
import {
  CACHE_DIR,
  LATEST_DAY_FETCHED_AT,
  STAGING_APPS_CACHE_FILE,
} from "../common/constants.js";

export async function loginToApps() {
  console.log("--- Starting loginToApps process...");
  try {
    const cachePath = join(CACHE_DIR, STAGING_APPS_CACHE_FILE);
    const latestDayPath = join(CACHE_DIR, LATEST_DAY_FETCHED_AT);

    if (existsSync(latestDayPath)) {
      console.log("Checking last login date...");
      const data = await readFile(latestDayPath, "utf-8");
      const lastFetched = new Date(JSON.stringify(data));
      const today = new Date();

      console.log(`Last login: ${lastFetched.toLocaleDateString()}`);
      console.log(`Today: ${today.toLocaleDateString()}`);

      if (lastFetched.toDateString() === today.toDateString()) {
        console.log("Already logged into all apps today, skipping...");
        return;
      }
    } else {
      console.log("No previous login date found, proceeding with logins...");
    }

    console.log("Reading apps from cache...");
    const apps = JSON.parse(
      await readFile(cachePath, "utf-8")
    ) as ApplicationServiceSchema[];
    console.log(`Found ${apps.length} apps to process`);

    console.log("Starting login process for all apps...");
    const loginResults = await Promise.all(
      apps.map(async (app) => {
        try {
          console.log(`Attempting login for ${app.metadata.name}...`);
          await execAsync(`tsh app login ${app.metadata.name}`);
          console.log(`✓ Successfully logged into ${app.metadata.name}`);
          return { name: app.metadata.name, success: true };
        } catch (err) {
          console.error(`✗ Failed to login to ${app.metadata.name}:`, err);
          return { name: app.metadata.name, success: false };
        }
      })
    );

    const successCount = loginResults.filter((r) => r.success).length;
    const failCount = loginResults.filter((r) => !r.success).length;

    console.log("Updating last login date...");
    await writeFile(latestDayPath, new Date().toDateString());

    console.log(`Login process complete:`);
    console.log(`- Successfully logged into: ${successCount} apps`);
    console.log(`- Failed logins: ${failCount} apps`);
  } catch (err) {
    console.error("Failed to process app logins:", err);
    if (err instanceof Error) {
      console.error("Error details:", {
        message: err.message,
        stack: err.stack,
      });
    }
    throw err;
  }
}
