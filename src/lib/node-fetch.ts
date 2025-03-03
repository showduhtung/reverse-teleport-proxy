import fetcher, { type Response as NodeFetchResponse } from "node-fetch";

export async function convertNodeResponse(
  res: NodeFetchResponse
): Promise<Response> {
  const buffer = await res.arrayBuffer();
  const headers: Record<string, string> = {};
  res.headers.forEach((value, key) => (headers[key] = value));

  const { status, statusText } = res;
  return new Response(buffer, { status, statusText, headers });
}
