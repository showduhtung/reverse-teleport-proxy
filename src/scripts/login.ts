import { spawnAsync, execAsync } from "../lib/process.js";

export async function login() {
  console.log("Checking Teleport authentication status");

  try {
    const { stdout } = await execAsync("tsh status");
    if (stdout.includes("logged in")) {
      console.log("Active session detected, skipping login");
      return;
    }
  } catch (err) {
    console.log("No active session, initiating Okta login flow");
    await spawnAsync(
      "tsh",
      [
        "login",
        `--proxy=${process.env.TELEPORT_URL}:443`,
        process.env.TELEPORT_URL as string,
        "--auth=okta",
      ],
      { stdio: "inherit" }
    );
    console.log("Successfully authenticated with Teleport");
  }
}
