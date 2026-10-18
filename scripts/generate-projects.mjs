/**
 * 文件说明: 从 chinese-independent-developer 的 Markdown 清单生成项目快照，并补充公开 GitHub Stars。
 * 参考资料: https://github.com/1c7/chinese-independent-developer
 */

import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
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
  { files: ["README.md"], name: "主版面" },
  { files: [".github/pages/README-Programmer-Edition.md", "pages/README-Programmer-Edition.md"], name: "程序员" },
  { files: [".github/pages/README-Game.md", "pages/README-Game.md"], name: "游戏" },
  { files: [".github/pages/README-Earlier-Projects.md"], name: "历史归档" },
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

// 分类以产品用途为依据；首句和名称比后续功能、技术栈与推广说明权重更高。
const categoryRules = [
  { category: "教育学习", pattern: /太阳系|天文|行星|科普|汉字|字形|字典|课堂|教学|教育|学习(?:平台|网站|工具|应用|助手|资源|英语|日语)|(?:英语|日语|语言|单词|词汇|口语|语法|五十音).{0,6}(?:学习|练习|跟读|训练)|跟读|背单词|背诵|题库|考试|雅思|课程|教材|绘本|\b(?:jlpt|ielts|flashcards?)\b/i },
  { category: "数据金融", pattern: /记账|账本|账单|分账|财务|财报|会计|股票|炒股|证券|基金|理财|定投|投资(?:分析|顾问|组合|标的|机会)|投资者|创投|量化|回测|汇率|加密货币|数字货币|退休|\b(?:tradingview|stock|stocks|etf|finance|beancount|fire)\b/i },
  { category: "生活健康", pattern: /健康(?:档案|应用|管理|提醒|急救)|家庭健康|康复|慰问|热量|医疗|病历|体检|化验|医保|用药|心理|情感|依恋|睡眠|饮食|食谱|健身|减脂|减肥|体重|卡路里|正念|宠物(?:陪伴|档案|管家)|育儿|宝宝|旅行(?:规划|攻略)|旅游|菜谱|\b(?:hiit|tabata)\b/i },
  { category: "营销电商", pattern: /电商|卖家|商品(?:图|文案|详情|管理)|店铺|网店|独立站|外贸|跨境(?:电商|卖家|选品)|选品|获客|营销|广告(?:投放|管理|制作|素材|创意|平台)|广告变体|视频广告|投放广告|社媒(?:运营|账号|管理)|社交媒体(?:管理|运营|营销)|小红书(?:运营|合规)|小红书合规运营|搜索引擎优化|\b(?:etsy|shopify|seo|listing|listings|crm)\b/i },
  { category: "开发者工具", pattern: /代码(?:编辑|审查|审计|生成|搜索|分析|托管)|编程|编码|程序员|开发(?:工具|框架|环境|平台|助手|套件)|开发者(?:工具|平台|服务)|接口(?:调试|测试|管理)|API\s*(?:网关|调试|测试|管理|服务)|数据库|对象存储|云存储客户端|服务器|反向代理|终端|命令行工具|部署(?:工具|平台|服务)|日志(?:分析|查看)|进程(?:管理|清理)|插件.{0,8}(?:管理器|质量评分)|技能市场|(?:Agent|MCP|SDK).{0,8}(?:开发|调试|管理|市场)|llms\.txt|\b(?:ide|devops|docker|kubernetes|git|npm|regex|regexp)\b|Claude Code|Codex|Cursor|DeepSeek Harness|GitHub\s*(?:星标|仓库|Stars)|(?:Python|JavaScript|TypeScript|Golang|Rust|Java).{0,6}(?:库|框架|编程|SDK|开发|工具)/i },
  { category: "效率办公", pattern: /家务|打卡|习惯管理|笔记|知识库|知识图谱|待办|任务管理|计划管理|日程|日历|写作|稿子|改写|润色|简历|小说(?:创作|作家)|(?:Markdown|文本|文档)\s*编辑器|文档.{0,4}翻译|文档(?:编辑|管理)|翻译(?:工具|助手)|剪贴板|输入法|语音输入|语音转文字|转写|听写|转录|录音转文字|邮件管理|会议(?:记录|纪要)|思维导图|流程图|白板|项目管理|协作|工作流|自动化|窗口(?:布局|管理)|桌面(?:[（(][^）)]*[）)])?\s*(?:布局|空间|窗口|管理)|轻量桌面浏览器|标签页|文件(?:查看|管理|整理)|电子书|阅读器|伴读|\b(?:todo|markdown|obsidian|typora|epub|productivity)\b/i },
  { category: "影音创作", pattern: /视频|音频|音乐|歌曲|说唱|歌词|字幕|配音|播客|录屏|剪辑|直播|听书|音效|\b(?:video|audio|music|podcast|youtube|bilibili|mp4|mp3)\b/i },
  { category: "设计图片", pattern: /截图|拼豆|像素画|绘图|图片|图像|照片|摄影|修图|海报|图标|绘画|插画|示意图|图层|画笔|矢量|壁纸|精灵图|游戏资产|姿势|建模|网格.{0,6}(?:修复|检查)|字体|配色|设计(?:工具|素材|资源)|\b(?:image|images|photo|photos|logo|svg|figma|photoshop|psd|stl|3mf)\b/i },
  { category: "游戏娱乐", pattern: /游戏|谜题|棋牌|塔防|数独|推箱子|俄罗斯方块|手柄|抽卡|占星|星盘|星座|角色测试|粉丝测试|民俗娱乐|\b(?:game|games|gaming|steam|roblox|rogue|clicker|gamepad)\b/i },
  { category: "内容社区", pattern: /社区|论坛|博客|资讯|新闻|导航|目录|榜单|聚合|情报站|资源(?:站|库)|资料(?:站|库|整理站)|书籍|专题导读|冷知识|社交(?:平台|网络|资料)|\b(?:directory|directories|news|forum|community|newsletter)\b/i },
  { category: "实用工具", pattern: /转换|压缩|计算器|计时器|下载|二维码|工具箱|查询|检测|测试工具|生成器|文本行处理|排序行|地址生成|屏幕|显示器|帧率|内存优化|\b(?:converter|calculator|tester)\b/i },
];

function classify(name, description, board) {
  // 外链与“无广告”等运营说明不代表产品用途。
  const clean = (value) => value.replace(/https?:\/\/[^\s]+/gi, " ")
    .replace(/(?:无|没有|不含|去除|屏蔽)广告/g, " ");
  const title = clean(name);
  const body = clean(description);
  const primary = body.split(/[，,；;。\n]/, 1)[0];
  const purpose = body.split(/另有|另带|另外|另提供|附带|还带/, 1)[0];
  let category = null;
  let bestScore = 0;
  for (const rule of categoryRules) {
    // 输入照片不等于图片产品；明确的生成结果比输入材料更能说明用途。
    const outputScore = rule.category === "影音创作"
      && /(?:生成|合成|制作|输出|转为|转成)[^，,；;。]{0,40}(?:视频|音频|音乐|歌曲|MP4)|(?:文案|文字|图片|照片|文本)转(?:视频|音频)|(?:视频|音频|音乐|配音)(?:生成|制作|创作|编辑|工作台)/i.test(purpose) ? 12 : 0;
    const score = outputScore + (rule.pattern.test(primary) ? (rule.category === "营销电商" ? 20 : 8) : 0)
      + (rule.pattern.test(title) ? 5 : 0)
      + (rule.pattern.test(body) ? 2 : 0);
    if (score > bestScore) {
      category = rule.category;
      bestScore = score;
    }
  }
  if (category) return category;
  if (board === "游戏") return "游戏娱乐";
  if (/人工智能|大模型|智能体|提示词|\b(?:ai|gpt|chatgpt|claude|gemini|grok|agent|agents|llm)\b/i.test(`${title} ${body}`)) return "AI 应用";
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
          signal: AbortSignal.timeout(30_000),
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
    if (!payload?.data) {
      const message = payload.errors?.map((error) => error.message).join("；") || "未返回数据";
      throw new Error(`GitHub API 请求失败：${message}`);
    }
    if (payload.errors?.length) {
      console.warn(`GitHub API 返回 ${payload.errors.length} 个仓库解析警告，本批次继续处理：${payload.errors.map((error) => error.message).join("；")}`);
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

async function resolveBoardFile(board) {
  for (const file of board.files) {
    try {
      await access(resolve(sourceRoot, file));
      return file;
    } catch {
      // Try the next known upstream layout.
    }
  }
  throw new Error(`版面“${board.name}”文件不存在。已检查：${board.files.join("、")}；来源目录：${sourceRoot}`);
}

async function parseBoard(board) {
  const file = await resolveBoardFile(board);
  const markdown = await readFile(resolve(sourceRoot, file), "utf8");
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
      id: `${file}:${index + 1}`,
      name: parsed.name || "未命名项目",
      url: parsed.url,
      description: parsed.description || "暂无介绍",
      author,
      year,
      addedAt,
      status: statusNames[entry[1]],
      board: board.name,
      category: classify(parsed.name, parsed.description, board.name),
      sourceFile: file,
      sourceLine: index + 1,
      githubRepository: parsed.githubRepository ?? authorGithubRepository,
    };
    projects.push(project);
  });

  if (projects.length === 0) {
    throw new Error(`版面“${board.name}”文件 ${file} 未解析出任何项目，拒绝生成快照。`);
  }
  return projects;
}

if (!sourceRoot) throw new Error("SOURCE_REPO 未配置。");

let parsedByBoard;
try {
  parsedByBoard = await Promise.all(boards.map(parseBoard));
} catch (error) {
  throw new Error(`读取上游项目清单失败：${error instanceof Error ? error.message : String(error)}`, { cause: error });
}
const parsedProjects = parsedByBoard.flat();
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
const temporaryOutputPath = `${outputPath}.tmp-${process.pid}`;
try {
  await writeFile(temporaryOutputPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  await rename(temporaryOutputPath, outputPath);
} catch (error) {
  await unlink(temporaryOutputPath).catch(() => {});
  throw new Error(`写入项目快照失败：${error instanceof Error ? error.message : String(error)}`, { cause: error });
}
console.log(`Generated ${projects.length} projects from ${sourceCommit.slice(0, 7)}.`);
