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

async function createSource(root, includeProgrammer = true, mainEntries = null) {
  await mkdir(join(root, ".github/pages"), { recursive: true });
  const entry = "* :white_check_mark: [项目](https://example.com) - 示例项目\n";
  await writeFile(join(root, "README.md"), mainEntries ?? entry);
  await writeFile(join(root, ".github/pages/README-Game.md"), entry);
  await writeFile(join(root, ".github/pages/README-Earlier-Projects.md"), entry);
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

test("分类按主要用途区分技术属性、界面语言、附带功能与无广告说明", async () => {
  const cases = [
    ["3D 太阳系模拟器", "浏览器里的交互式 3D 太阳系，可环绕太阳与八大行星、切换真实距离或真实比例，还能降落到月球和火星表面；免费无广告，无需注册，适合课堂演示", "教育学习"],
    ["AR太阳系", "展示太阳系的运行", "教育学习"],
    ["Textus", "所见即所得的 Markdown 编辑器，支持公式、表格和 Mermaid，可选 AI 写作助手；免费开源", "效率办公"],
    ["AI Todo", "自然语言任务管理，说一句话就改成结构化任务操作；另提供 CLI 供 AI agent 调用，开源（MIT）", "效率办公"],
    ["拾光 Relight", "本地 AI 照片库，模型为照片打标签、自动设成壁纸，开源（MIT）", "设计图片"],
    ["LayoutKeeper", "Mac 外接屏窗口布局恢复工具，免费开源", "效率办公"],
    ["花花记账", "注重设计与长期记录的 iPhone 生活账本，在本地根据个人记录学习消费习惯，支持记账地图与月度回顾", "数据金融"],
    ["Sesshu", "面向日本用户的 AI 视频生成网站（日语/英语界面），输入文字或上传图片生成视频", "影音创作"],
    ["CastDub", "AI 多角色配音工作台，支持中英日韩等 9 种语言", "影音创作"],
    ["steamvai", "文案转视频，根据文案内容生成视频资源", "影音创作"],
    ["ClassGamifyy", "把课堂内容变成互动学习游戏的教学平台", "教育学习"],
    ["SpritePixel", "面向个人和独立游戏开发者的 AI 游戏资产工作室，创建游戏精灵图与配套图标", "设计图片"],
    ["SkillHey", "AI Agent 技能市场，按网页、图片、视频与文档分类浏览技能", "开发者工具"],
    ["DSH Studio", "本地优先的 DeepSeek Harness 桌面管理器，用图形界面完成健康检查、日志查看与进程清理", "开发者工具"],
    ["Remaker AI", "AI 图像生成、编辑与放大工作台，另带视频生成功能", "设计图片"],
    ["Dead Pixel Test", "屏幕坏点测试工具，通过全屏纯色检查显示器和笔记本电脑", "实用工具"],
    ["Ozil Goal AI", "上传一张授权照片，用 Kling O3 重新生成一段虚构的破门集锦，输出 10 秒带观众声的竖屏 MP4", "影音创作"],
    ["Alors on Danse AI", "上传两张照片，把你和朋友放进影棚，合成 10 秒双人合奏视频", "影音创作"],
    ["LogoMovo", "浏览器 Logo 设计工作台，调整设计后导出 SVG 或 PNG", "设计图片"],
    ["DishVivid", "餐厅菜单与外卖图片编辑器，在浏览器调整光线、颜色和裁剪", "设计图片"],
    ["Ad Multiplier", "视频广告变体工具，上传现有广告，生成不同人物的视觉版本", "营销电商"],
    ["投放助手", "广告投放管理平台，帮助卖家优化营销效果", "营销电商"],
    ["安静时钟", "一个时钟，免费无广告，提供英文界面与 API", "其他"],
    ["Children’s Chore", "面向孩子家庭的家务打卡与积分奖励工具，支持导出 PNG 卡片", "效率办公"],
    ["Screenshot Editor", "截图文字编辑工具，本地 OCR 识别后替换文字，适合营销素材", "设计图片"],
    ["声笺", "浏览器本地语音转文字工具，用 Whisper 转写音频和视频", "效率办公"],
    ["MacGrid", "Mac 多桌面（Spaces）管理 App，把桌面排成二维网格", "效率办公"],
    ["一个字的一生", "汉字字形演变查询工具，输入字看甲骨文到简体的演变", "教育学习"],
    ["Mailroom", "邮件管理应用", "效率办公"],
    ["ChatGPT 助手", "多模型 AI 对话应用", "AI 应用"],
  ];
  const root = await mkdtemp(join(tmpdir(), "atlas-classification-"));
  try {
    const output = join(root, "projects.json");
    await createSource(root, true, cases.map(([name, description]) =>
      `* :white_check_mark: [${name}](https://example.com) - ${description}\n`,
    ).join(""));
    await execFileAsync(process.execPath, [generator.pathname], {
      env: { ...process.env, SOURCE_REPO: root, PROJECTS_OUTPUT_PATH: output, GITHUB_TOKEN: "" },
    });
    const snapshot = JSON.parse(await readFile(output, "utf8"));
    const categories = new Map(snapshot.projects.filter((project) => project.board === "主版面")
      .map((project) => [project.name, project.category]));
    for (const [name, , category] of cases) {
      assert.equal(categories.get(name), category, name);
    }
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
