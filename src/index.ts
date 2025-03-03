import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import nodeFetch from "node-fetch";
import { Hono } from "hono";
import { convertNodeResponse } from "./lib/node-fetch.js";
import prepare from "./scripts/main.js";
import { services } from "./common/constants.js";
import { createUrlAndAgent, createHeaders } from "./utilities.js";
import { randomUUID } from "crypto";

const app = new Hono();
const PORT = parseInt(process.env.PORT || "3001");

app.use("*", logger());
app.use(
  "*",
  cors({
    origin: ["http://localhost:3000"], // Your Next.js app URL
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

prepare();

const mutations = ["post"] as const;

services.forEach(({ endpoint, service: name }) => {
  app.get(`/${endpoint}`, async (c) => {
    console.log(`Proxying GET request to ${name}...`);
    const { url, agent } = await createUrlAndAgent(endpoint, name, c.req);
    const headers = createHeaders(c.req);

    const fetched = await nodeFetch(url.toString(), {
      agent,
      headers,
    });
    const response = await convertNodeResponse(fetched);
    console.log(`Proxied GET request for ${name} successfully`);

    return response;
  });

  mutations.forEach((method) => {
    app[method](`/${endpoint}`, async (c) => {
      console.log(`Proxying ${method.toUpperCase()} request to ${name}...`);
      const { url, agent } = await createUrlAndAgent(endpoint, name, c.req);
      const headers = createHeaders(c.req);
      const blob = await c.req.json();

      const body = {
        data: {
          id: blob.id || randomUUID(),
          type: name,
          attributes: blob.data,
        },
      };
      const fetched = await nodeFetch(url.toString(), {
        agent,
        headers,
        method,
        body: JSON.stringify(body),
      });
      const response = await convertNodeResponse(fetched);
      console.log(
        `Proxied ${method.toUpperCase()} request for ${name} successfully`
      );

      return response;
    });
  });
});

console.log(`Server is running on http://localhost:${PORT}`);

serve({ fetch: app.fetch, port: PORT });
