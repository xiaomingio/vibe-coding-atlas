/**
 * 文件说明: 从 chinese-independent-developer 的 Markdown 清单生成项目快照，并补充公开 GitHub Stars。
 * 参考资料: https://github.com/1c7/chinese-independent-developer
 */

import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = process.env.SOURCE_REPO
  ? resolve(process.env.SOURCE_REPO)
  : resolve(projectRoot, "source");
const outputPath = process.env.PROJECTS_OUTPUT_PATH
  ? resolve(process.env.PROJECTS_OUTPUT_PATH)
  : resolve(projectRoot, "public/data/projects.json");
const githubSourceRepository = "1c7/chinese-independent-developer";

const boards = [
  { file: "README.md", name: "主版面" },
  { file: "pages/README-Programmer-Edition.md", name: "程序员" },
  { file: "pages/README-Game.md", name: "游戏" },
  { file: "pages/README-2018-2020.md", name: "历史归档" },
];

const statusNames = {
  white_check_mark: "已上线",
  clock8: "开发中",
  x: "已关闭",
};

function plainText(value) {
  return value
    .replace(/<!--.*?-->/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function classify(name, description, board) {
  const text = `${name} ${description}`.toLowerCase();
  const matches = (pattern) => pattern.test(text);

  if (board === "游戏" || matches(/游戏|game|steam|roblox|谜题|猜词|塔防|rogue|棋牌|clicker/i)) return "游戏娱乐";
  if (matches(/开发者|程序员|github|api|sdk|cli|代码|编程|部署|数据库|框架|开源|server|terminal|devops|docker|kubernetes/i)) return "开发者工具";
  if (matches(/etsy|shopify|电商|卖家|商品|listing|独立站|外贸|跨境|订单|店铺/i)) return "营销电商";
  if (matches(/seo|营销|广告|获客|社交媒体|受众|newsletter|邮件营销|内容营销|流量/i)) return "营销电商";
  if (matches(/教育|学习|课程|单词|英语|日语|雅思|课堂|题库|练习|考试|背诵|语言/i)) return "教育学习";
  if (matches(/股票|交易|量化|基金|金融|投资|加密货币|tradingview|记账|汇率/i)) return "数据金融";
  if (matches(/视频|音频|音乐|字幕|配音|播客|短剧|直播|video|audio|music|youtube|bilibili/i)) return "影音创作";
  if (matches(/图片|图像|照片|摄影|设计|海报|图标|绘画|image|photo|logo|svg|字体|配色/i)) return "设计图片";
  if (matches(/笔记|知识|待办|日程|写作|markdown|工作流|自动化|表单|协作|项目管理|效率|剪贴板|时间管理/i)) return "效率办公";
  if (matches(/健康|医疗|心理|情感|睡眠|饮食|健身|医院|药|体重|关系测试/i)) return "生活健康";
  if (matches(/社区|论坛|博客|资讯|新闻|导航|目录|榜单|聚合|搜索|社交|聊天/i)) return "内容社区";
  if (matches(/ai|gpt|claude|gemini|grok|大模型|提示词|agent|智能体|生成/i)) return "AI 应用";
  if (matches(/转换|压缩|计算器|下载|二维码|格式|工具箱|查询|检测|生成器|converter|calculator|downloader/i)) return "实用工具";
  return "其他";
}

function githubRepositoryFromUrl(value) {
  try {
    const url = new URL(value);
    if (!/^(?:www\.)?github\.com$/i.test(url.hostname)) return null;
    const [owner, rawName] = url.pathname.split("/").filter(Boolean);
    const reservedOwners = new Set(["apps", "collections", "codespaces", "enterprise", "explore", "features", "join", "login", "marketplace", "new", "notifications", "orgs", "organizations", "pricing", "search", "settings", "sponsors", "topics", "user-attachments", "users"]);
    const name = rawName?.replace(/\.git$/i, "");
    if (!owner || !name || reservedOwners.has(owner.toLowerCase())) return null;
    if (!/^[\w.-]+$/.test(owner) || !/^[\w.-]+$/.test(name)) return null;
    if (`${owner}/${name}`.toLowerCase() === githubSourceRepository.toLowerCase()) return null;
    return {
      key: `${owner}/${name}`.toLowerCase(),
      nameWithOwner: `${owner}/${name}`,
      owner,
      name,
      url: `https://github.com/${owner}/${name}`,
    };
  } catch {
    return null;
  }
}

function findGithubRepository(value) {
  for (const match of value.matchAll(/https?:\/\/[^\s)]+/gi)) {
    const repository = githubRepositoryFromUrl(match[0]);
    if (repository) return repository;
  }
  return null;
}

function resolveGithubToken() {
  if (process.env.GITHUB_TOKEN) return { token: process.env.GITHUB_TOKEN, source: "GITHUB_TOKEN" };
  if (process.env.GH_TOKEN) return { token: process.env.GH_TOKEN, source: "GH_TOKEN" };

  try {
    const token = execFileSync("gh", ["auth", "token"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return token ? { token, source: "GitHub CLI" } : { token: "", source: "" };
  } catch {
    return { token: "", source: "" };
  }
}

async function readExistingGithubData() {
  try {
    const existing = JSON.parse(await readFile(outputPath, "utf8"));
    const repositories = new Map();
    for (const project of existing.projects ?? []) {
      if (project.githubRepository && Number.isInteger(project.githubStars)) {
        repositories.set(project.githubRepository.toLowerCase(), {
          nameWithOwner: project.githubRepository,
          stars: project.githubStars,
          url: project.githubUrl,
        });
      }
    }
    return {
      fetchedAt: existing.meta?.githubStarsFetchedAt ?? null,
      repositories,
    };
  } catch {
    return { fetchedAt: null, repositories: new Map() };
  }
}

async function fetchGithubData(repositories, githubToken) {
  const fetched = new Map();
  const batchSize = 50;

  for (let offset = 0; offset < repositories.length; offset += batchSize) {
    const batch = repositories.slice(offset, offset + batchSize);
    const fields = batch.map((repository, index) =>
      `repo${index}: repository(owner: ${JSON.stringify(repository.owner)}, name: ${JSON.stringify(repository.name)}) { isPrivate nameWithOwner stargazerCount url }`,
    ).join("\n");
    const query = `query ProjectRepositories {\n${fields}\n}`;
    let payload;
    let lastError;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const response = await fetch("https://api.github.com/graphql", {
          method: "POST",
          headers: {
            accept: "application/vnd.github+json",
            authorization: `Bearer ${githubToken}`,
            "content-type": "application/json",
            "user-agent": "vibe-coding-atlas-data-generator",
          },
          body: JSON.stringify({ query }),
        });
        if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
        payload = await response.json();
        break;
      } catch (error) {
        lastError = error;
        if (attempt < 3) await new Promise((resolveDelay) => setTimeout(resolveDelay, attempt * 500));
      }
    }
    if (!payload) throw new Error(`GitHub API 请求失败：${lastError?.message ?? "未知错误"}`);
    if (!payload.data) {
      const message = payload.errors?.map((error) => error.message).join("；") || "未返回数据";
      throw new Error(`GitHub API 请求失败：${message}`);
    }
    batch.forEach((repository, index) => {
      const result = payload.data[`repo${index}`];
      if (!result || result.isPrivate) return;
      fetched.set(repository.key, {
        nameWithOwner: result.nameWithOwner,
        stars: result.stargazerCount,
        url: result.url,
      });
    });
  }

  return { fetchedAt: new Date().toISOString(), repositories: fetched };
}

function parseProjectLine(body) {
  const link = body.match(/\[([^\]]+)\]\(([^)]+)\)/);
  if (!link) {
    const [name, ...rest] = body.split(/[：:]/);
    return { name: plainText(name), url: "", description: plainText(rest.join("：")), githubRepository: findGithubRepository(body) };
  }
  const tail = body.slice((link.index ?? 0) + link[0].length);
  const description = tail
    .replace(/^[\s：:-]+/, "")
    .replace(/\s+-\s+\[更多介绍\].*$/i, "")
    .replace(/\s+\[更多介绍\].*$/i, "");
  return {
    name: plainText(link[1]),
    url: link[2].trim(),
    description: plainText(description),
    githubRepository: findGithubRepository(body),
  };
}

async function parseBoard(board) {
  const markdown = await readFile(resolve(sourceRoot, board.file), "utf8");
  const lines = markdown.split(/\r?\n/);
  const projects = [];
  let author = "未注明";
  let authorGithubRepository = null;
  let year = null;
  let addedAt = "未注明";

  lines.forEach((line, index) => {
    const date = line.match(/^###\s+(20\d{2})\s*年\s*(?:(\d{1,2})\s*月)?\s*(?:(\d{1,2})\s*(?:日|号))?/);
    if (date) {
      year = Number(date[1]);
      addedAt = [date[1], date[2]?.padStart(2, "0"), date[3]?.padStart(2, "0")].filter(Boolean).join("-");
      return;
    }
    if (/^####\s+/.test(line)) {
      author = plainText(line.replace(/^####\s+/, "").replace(/\s+-\s+.*$/, "")) || "未注明";
      authorGithubRepository = findGithubRepository(line);
      return;
    }
    const entry = line.match(/^\*\s+:([a-z0-9_]+):\s+(.*)$/i);
    if (!entry || !(entry[1] in statusNames)) return;

    const parsed = parseProjectLine(entry[2]);
    const project = {
      id: `${board.file}:${index + 1}`,
      name: parsed.name || "未命名项目",
      url: parsed.url,
      description: parsed.description || "暂无介绍",
      author,
      year,
      addedAt,
      status: statusNames[entry[1]],
      board: board.name,
      category: classify(parsed.name, parsed.description, board.name),
      sourceFile: board.file,
      sourceLine: index + 1,
      githubRepository: parsed.githubRepository ?? authorGithubRepository,
    };
    projects.push(project);
  });

  return projects;
}

const parsedProjects = (await Promise.all(boards.map(parseBoard))).flat();
const detectedRepositories = [...new Map(
  parsedProjects
    .filter((project) => project.githubRepository)
    .map((project) => [project.githubRepository.key, project.githubRepository]),
).values()];
const githubAuth = resolveGithubToken();
const githubData = githubAuth.token
  ? await fetchGithubData(detectedRepositories, githubAuth.token)
  : await readExistingGithubData();
if (githubAuth.token) {
  console.warn(`使用 ${githubAuth.source} 刷新 GitHub Stars。`);
} else {
  console.warn("未提供 GITHUB_TOKEN / GH_TOKEN，且无法从 GitHub CLI 获取 token，沿用已有 GitHub Stars 快照。");
}

const projects = parsedProjects.map((project) => {
  const github = project.githubRepository ? githubData.repositories.get(project.githubRepository.key) : null;
  return {
    ...project,
    githubRepository: github?.nameWithOwner ?? project.githubRepository?.nameWithOwner ?? null,
    githubUrl: github?.url ?? project.githubRepository?.url ?? null,
    githubStars: github?.stars ?? null,
  };
});
const sourceCommit = execFileSync("git", ["rev-parse", "HEAD"], {
  cwd: sourceRoot,
  encoding: "utf8",
}).trim();

const snapshot = {
  meta: {
    source: "1c7/chinese-independent-developer",
    sourceCommit,
    generatedAt: new Date().toISOString(),
    githubStarsFetchedAt: githubData.fetchedAt,
    githubRepositoriesDetected: detectedRepositories.length,
    githubRepositoriesResolved: githubData.repositories.size,
    total: projects.length,
  },
  projects,
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
console.log(`Generated ${projects.length} projects from ${sourceCommit.slice(0, 7)}.`);
