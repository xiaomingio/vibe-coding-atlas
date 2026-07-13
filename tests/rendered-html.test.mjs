/**
 * 文件说明: 验证项目快照完整性和静态站点构建产物。
 */

import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

test("项目快照包含全部版面和必要展示字段", async () => {
  const snapshot = JSON.parse(await readFile(new URL("app/data/projects.json", projectRoot), "utf8"));
  const boards = new Set(snapshot.projects.map((project) => project.board));

  assert.equal(snapshot.meta.total, snapshot.projects.length);
  assert.ok(snapshot.projects.length >= 2400);
  assert.deepEqual([...boards].sort(), ["主版面", "历史归档", "游戏", "程序员"].sort());
  assert.ok(snapshot.projects.every((project) => project.name && project.category && project.rating >= 1 && project.rating <= 5));
});

test("生产构建包含可直接托管的静态首页和资源", async () => {
  const [html, assets] = await Promise.all([
    readFile(new URL("dist/index.html", projectRoot), "utf8"),
    readdir(new URL("dist/assets/", projectRoot)),
  ]);

  assert.match(html, /<html lang="zh-CN">/i);
  assert.match(html, /<title>Vibe Coding Atlas/);
  assert.match(html, /id="root"/);
  assert.ok(assets.some((name) => name.endsWith(".js")));
  assert.ok(assets.some((name) => name.endsWith(".css")));
});
