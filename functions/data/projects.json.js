/**
 * 文件说明: 为 Cloudflare Pages 提供同源项目数据接口，从 GitHub data 分支读取最新快照。
 */

export const projectsDataUrl = "https://raw.githubusercontent.com/xiaomingio/vibe-coding-atlas/data/projects.json";

const cacheControl = "public, max-age=300, stale-while-revalidate=86400";

function jsonHeaders(extra = {}) {
  return {
    "content-type": "application/json; charset=utf-8",
    "cache-control": cacheControl,
    "x-content-type-options": "nosniff",
    ...extra,
  };
}

export async function onRequest(context) {
  if (context.request.method !== "GET" && context.request.method !== "HEAD") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: jsonHeaders({ allow: "GET, HEAD" }),
    });
  }

  const response = await fetch(projectsDataUrl, {
    headers: {
      accept: "application/json",
      "user-agent": "vibe-coding-atlas-pages-function",
    },
    cf: {
      cacheEverything: true,
      cacheTtl: 300,
    },
  });

  if (!response.ok || !response.body) {
    return new Response(JSON.stringify({ error: "Project data unavailable" }), {
      status: 502,
      headers: jsonHeaders(),
    });
  }

  return new Response(context.request.method === "HEAD" ? null : response.body, {
    status: 200,
    headers: jsonHeaders({
      "x-data-source": "github:data",
    }),
  });
}
