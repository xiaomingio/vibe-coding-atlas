/**
 * 文件说明: 为 Cloudflare Pages 显式提供 robots.txt，避免自定义域名被 SPA fallback 命中。
 */

const robots = `User-agent: *
Allow: /

Sitemap: https://vibecoding.aicake.io/sitemap.xml
`;

export function onRequest(context) {
  if (context.request.method !== "GET" && context.request.method !== "HEAD") {
    return new Response("Method not allowed", {
      status: 405,
      headers: {
        allow: "GET, HEAD",
        "content-type": "text/plain; charset=utf-8",
        "x-content-type-options": "nosniff",
      },
    });
  }

  return new Response(context.request.method === "HEAD" ? null : robots, {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=300, stale-while-revalidate=86400",
      "x-content-type-options": "nosniff",
    },
  });
}
