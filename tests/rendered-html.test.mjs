/**
 * 文件说明: 验证项目数据接口代理和静态站点构建产物。
 */

import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import { onRequest, projectsDataUrl } from "../functions/data/projects.json.js";
import { onRequest as onRobotsRequest } from "../functions/robots.txt.js";

const projectRoot = new URL("../", import.meta.url);

test("生成的数据快照包含全部版面和必要展示字段", async (t) => {
  if (!process.env.PROJECTS_SNAPSHOT_PATH) {
    t.skip("未指定 PROJECTS_SNAPSHOT_PATH");
    return;
  }

  const snapshot = JSON.parse(await readFile(process.env.PROJECTS_SNAPSHOT_PATH, "utf8"));
  const boards = new Set(snapshot.projects.map((project) => project.board));

  assert.equal(snapshot.meta.total, snapshot.projects.length);
  assert.ok(snapshot.projects.length >= 2400);
  assert.deepEqual([...boards].sort(), ["主版面", "历史归档", "游戏", "程序员"].sort());
  assert.ok(snapshot.projects.every((project) => project.name && project.category && project.addedAt));
  assert.ok(snapshot.projects.every((project) => !("rating" in project) && !("reason" in project)));
  assert.ok(snapshot.projects.some((project) => project.githubUrl && Number.isInteger(project.githubStars)));
  assert.ok(snapshot.projects.every((project) => project.githubStars === null || project.githubStars >= 0));
  assert.ok(snapshot.projects.every((project) => !project.githubUrl?.includes("/user-attachments/")));
});

test("项目数据接口从 data 分支代理 JSON 快照", async () => {
  const originalFetch = globalThis.fetch;
  const snapshot = { meta: { total: 1 }, projects: [{ name: "Vibe Coding Atlas" }] };
  globalThis.fetch = async (url, init) => {
    assert.equal(url, projectsDataUrl);
    assert.equal(init.headers.accept, "application/json");
    return new Response(JSON.stringify(snapshot), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  try {
    const response = await onRequest({ request: new Request("https://example.com/data/projects.json") });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "application/json; charset=utf-8");
    assert.equal(response.headers.get("x-data-source"), "github:data");
    assert.deepEqual(await response.json(), snapshot);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("项目数据接口拒绝非读取请求", async () => {
  const response = await onRequest({ request: new Request("https://example.com/data/projects.json", { method: "POST" }) });

  assert.equal(response.status, 405);
  assert.equal(response.headers.get("allow"), "GET, HEAD");
});

test("robots.txt 接口显式返回抓取规则", async () => {
  const response = await onRobotsRequest({ request: new Request("https://example.com/robots.txt") });
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "text/plain; charset=utf-8");
  assert.match(body, /^User-agent: \*/);
  assert.match(body, /Sitemap: https:\/\/vibecoding\.aicake\.io\/sitemap\.xml/);
});

test("生产构建包含可直接托管的静态首页和资源", async () => {
  const [html, robots, sitemap, llms, assets] = await Promise.all([
    readFile(new URL("dist/index.html", projectRoot), "utf8"),
    readFile(new URL("dist/robots.txt", projectRoot), "utf8"),
    readFile(new URL("dist/sitemap.xml", projectRoot), "utf8"),
    readFile(new URL("dist/llms.txt", projectRoot), "utf8"),
    readdir(new URL("dist/assets/", projectRoot)),
  ]);

  assert.match(html, /<html lang="zh-CN">/i);
  assert.match(html, /<title>Vibe Coding Atlas｜中国独立开发者项目列表网页版<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/vibecoding\.aicake\.io\/"/);
  assert.match(html, /src="https:\/\/stats\.aicake\.io\/script\.js"/);
  assert.match(html, /data-website-id="0acd301b-dc5b-4728-bd79-1a110f3746af"/);
  assert.match(html, /"@type": "Dataset"/);
  assert.match(html, /1c7\/chinese-independent-developer/);
  assert.match(html, /项目数据每日刷新/);
  assert.match(html, /id="root"/);
  assert.match(robots, /Sitemap: https:\/\/vibecoding\.aicake\.io\/sitemap\.xml/);
  assert.match(sitemap, /<loc>https:\/\/vibecoding\.aicake\.io\/<\/loc>/);
  assert.match(llms, /Vibe Coding Atlas 是中国独立开发者项目列表网页版/);
  assert.match(llms, /https:\/\/vibecoding\.aicake\.io\/data\/projects\.json/);
  assert.ok(assets.some((name) => name.endsWith(".js")));
  assert.ok(assets.some((name) => name.endsWith(".css")));
});
