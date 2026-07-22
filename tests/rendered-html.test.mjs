/**
 * 文件说明: 验证项目数据快照和静态站点构建产物。
 */

import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

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

test("静态 robots.txt 包含抓取规则", async () => {
  const body = await readFile(new URL("public/robots.txt", projectRoot), "utf8");

  assert.match(body, /^User-agent: \*/);
  assert.match(body, /Sitemap: https:\/\/vibecoding\.aicake\.io\/sitemap\.xml/);
});

test("生产构建包含可直接托管的静态首页和资源", async () => {
  const [html, notFound, robots, sitemap, llms, assets] = await Promise.all([
    readFile(new URL("dist/index.html", projectRoot), "utf8"),
    readFile(new URL("dist/404.html", projectRoot), "utf8"),
    readFile(new URL("dist/robots.txt", projectRoot), "utf8"),
    readFile(new URL("dist/sitemap.xml", projectRoot), "utf8"),
    readFile(new URL("dist/llms.txt", projectRoot), "utf8"),
    readdir(new URL("dist/assets/", projectRoot)),
  ]);

  assert.match(html, /<html lang="zh-CN">/i);
  assert.match(html, /<title>Vibe Coding Atlas｜中国独立开发者项目目录<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/vibecoding\.aicake\.io\/"/);
  assert.match(html, /src="https:\/\/stats\.aicake\.io\/script\.js"/);
  assert.match(html, /data-website-id="0acd301b-dc5b-4728-bd79-1a110f3746af"/);
  assert.match(html, /"@type": "Dataset"/);
  assert.match(html, /1c7\/chinese-independent-developer/);
  assert.match(html, /项目数据每日刷新/);
  assert.match(html, /id="root"/);
  assert.match(notFound, /页面未找到/);
  assert.doesNotMatch(notFound, /\/assets\//);
  assert.match(robots, /Sitemap: https:\/\/vibecoding\.aicake\.io\/sitemap\.xml/);
  assert.match(sitemap, /<loc>https:\/\/vibecoding\.aicake\.io\/<\/loc>/);
  assert.match(llms, /Vibe Coding Atlas 是中国独立开发者项目目录/);
  assert.match(llms, /https:\/\/vibecoding\.aicake\.io\/data\/projects\.json/);
  assert.ok(assets.some((name) => name.endsWith(".js")));
  assert.ok(assets.some((name) => name.endsWith(".css")));
});
