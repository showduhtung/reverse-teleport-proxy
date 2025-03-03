import { type Response as NodeFetchResponse } from "node-fetch";
import type { ApplicationServiceSchema } from "./scripts/get-staging-services.js";
import { existsSync } from "fs";
import { readFile } from "fs/promises";
import { join } from "path";
import {
  CACHE_DIR,
  services,
  STAGING_APPS_CACHE_FILE,
} from "./common/constants.js";
import { Agent } from "https";
import type { HonoRequest } from "hono";

async function convertNodeResponse(res: NodeFetchResponse): Promise<Response> {
  const buffer = await res.arrayBuffer();
  const headers: Record<string, string> = {};
  res.headers.forEach((value, key) => (headers[key] = value));

  const { status, statusText } = res;
  return new Response(buffer, { status, statusText, headers });
}

async function getServiceForEndpoint(
  serviceName: string
): Promise<ApplicationServiceSchema | undefined> {
  const cachePath = join(CACHE_DIR, STAGING_APPS_CACHE_FILE);

  if (!existsSync(cachePath)) {
    throw new Error("Cache not found. Please run getStagingServices first.");
  }

  const apps = JSON.parse(
    await readFile(cachePath, "utf-8")
  ) as ApplicationServiceSchema[];

  return apps.find((app) => app.metadata.name.startsWith(serviceName));
}

async function createAgent(service: ApplicationServiceSchema) {
  const cert = await readFile(
    process.env.CERT_PATH + `/${service.metadata.name}-x509.pem`
  );
  const key = await readFile(process.env.KEY_PATH as string);

  return new Agent({ cert, key });
}

async function createUrlAndAgent(
  endpoint: (typeof services)[number]["endpoint"],
  name: string,
  req: HonoRequest
) {
  const service = await getServiceForEndpoint(name);
  if (!service) throw new Error(`Service ${service} not found in cache`);

  const url = new URL(`https://${service.spec.public_addr}/${endpoint}`);
  const searchParams = new URLSearchParams(req.url.split("?")[1] || "");
  searchParams.forEach((value, key) => url.searchParams.append(key, value));

  return { url, agent: await createAgent(service) };
}

function createHeaders(req: HonoRequest) {
  const headers: Record<string, string> = {};

  Object.entries(req.header()).forEach(([key, value]) => {
    if (key !== "host" && key !== "connection" && value !== undefined) {
      headers[key] = value;
    }
  });

  headers["content-type"] = "application/vnd.api+json";
  headers["x-forwarded-by"] = "hono-proxy";

  return headers;
}

export {
  getServiceForEndpoint,
  convertNodeResponse,
  createAgent,
  createUrlAndAgent,
  createHeaders,
};
