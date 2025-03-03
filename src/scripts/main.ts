import { getStagingServices } from "./get-staging-services.js";
import { login } from "./login.js";
import { loginToApps } from "./login-to-apps.js";

async function main() {
  try {
    await login();
    await getStagingServices();
    await loginToApps();
  } catch (err) {
    console.error(err);
  }
}

export default main;
