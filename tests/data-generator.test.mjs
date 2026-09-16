/*
 * 文件说明: 验证上游版面路径变更和生成失败时的退出行为。
 */

import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import test from "node:test";

const execFileAsync = promisify(execFile);
const generator = new URL("../scripts/generate-projects.mjs", import.meta.url);

async function createSource(root, includeProgrammer = true) {
  await mkdir(join(root, ".github/pages"), { recursive: true });
  const entry = "* :white_check_mark: [项目](https://example.com) - 示例项目\n";
  await writeFile(join(root, "README.md"), entry);
  await writeFile(join(root, ".github/pages/README-Game.md"), entry);
  await writeFile(join(root, ".github/pages/README-Archive.md"), entry);
  if (includeProgrammer) {
    await writeFile(join(root, ".github/pages/README-Programmer-Edition.md"), entry);
  }
  await execFileAsync("git", ["init", "--quiet"], { cwd: root });
  await execFileAsync("git", ["config", "user.email", "test@example.com"], { cwd: root });
  await execFileAsync("git", ["config", "user.name", "Test"], { cwd: root });
  await execFileAsync("git", ["add", "."], { cwd: root });
  await execFileAsync("git", ["commit", "--quiet", "-m", "fixture"], { cwd: root });
}

test("生成器识别上游迁移到 .github/pages 的版面文件", async () => {
  const root = await mkdtemp(join(tmpdir(), "atlas-generator-"));
  try {
    const output = join(root, "projects.json");
    await createSource(root);
    await execFileAsync(process.execPath, [generator.pathname], {
      env: { ...process.env, SOURCE_REPO: root, PROJECTS_OUTPUT_PATH: output, GITHUB_TOKEN: "" },
    });
    const snapshot = JSON.parse(await readFile(output, "utf8"));
    assert.deepEqual([...new Set(snapshot.projects.map((project) => project.board))].sort(), ["主版面", "历史归档", "游戏", "程序员"].sort());
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("版面文件缺失时生成器失败且不写出快照", async () => {
  const root = await mkdtemp(join(tmpdir(), "atlas-generator-"));
  try {
    const output = join(root, "projects.json");
    await createSource(root, false);
    await assert.rejects(
      execFileAsync(process.execPath, [generator.pathname], {
        env: { ...process.env, SOURCE_REPO: root, PROJECTS_OUTPUT_PATH: output, GITHUB_TOKEN: "" },
      }),
      /版面“程序员”文件不存在/,
    );
    await assert.rejects(readFile(output, "utf8"), { code: "ENOENT" });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
