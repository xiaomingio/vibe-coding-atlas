/**
 * 文件说明: 验证项目、作者账号及多关键词的目录搜索行为。
 */

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { ModuleKind, ScriptTarget, transpileModule } from "typescript";

const source = await readFile(new URL("../app/lib/project-search.ts", import.meta.url), "utf8");
const { outputText } = transpileModule(source, { compilerOptions: { module: ModuleKind.ESNext, target: ScriptTarget.ES2022 } });
const { matchesProjectQuery } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);

const project = {
  name: "NeatMD",
  description: "轻量 Markdown 编辑器",
  author: "小明",
  authorGithubUrl: "https://github.com/xiaomingio",
  url: "https://neatmd.example.com",
  githubRepository: null,
  githubUrl: null,
};

test("作者展示中文名时仍可用 GitHub 用户名找到未开源项目", () => {
  assert.equal(matchesProjectQuery(project, "xiaoming"), true);
  assert.equal(matchesProjectQuery(project, " XIAOMINGIO "), true);
  assert.equal(matchesProjectQuery(project, "小明"), true);
  assert.equal(matchesProjectQuery(project, "another-user"), false);
});

test("项目名支持大小写、空格差异和多个搜索词", () => {
  assert.equal(matchesProjectQuery(project, "neat md"), true);
  assert.equal(matchesProjectQuery({ ...project, name: "Neat MD", url: "" }, "neatmd"), true);
  assert.equal(matchesProjectQuery(project, "xiaoming markdown"), true);
  assert.equal(matchesProjectQuery(project, "neat missing"), false);
  assert.equal(matchesProjectQuery(project, "   "), true);
});

test("项目网址和开源仓库同样参与搜索，缺失可选链接时可正常匹配", () => {
  assert.equal(matchesProjectQuery(project, "neatmd.example.com"), true);
  const openSource = { ...project, authorGithubUrl: null, githubRepository: "another-owner/editor", githubUrl: "https://github.com/another-owner/editor" };
  assert.equal(matchesProjectQuery(openSource, "another-owner"), true);
  assert.equal(matchesProjectQuery(openSource, "轻量"), true);
});
