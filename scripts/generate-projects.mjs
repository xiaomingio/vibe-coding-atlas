/**
 * 文件说明: 从 chinese-independent-developer 的 Markdown 清单生成网页使用的项目快照。
 * 参考资料: https://github.com/1c7/chinese-independent-developer
 */

import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = process.env.SOURCE_REPO
  ? resolve(process.env.SOURCE_REPO)
  : resolve(projectRoot, "../third_party/chinese-independent-developer");
const outputPath = resolve(projectRoot, "app/data/projects.json");

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

const featured = new Map(
  [
    ["listlift", 5, "垂直用户明确，价值可直接关联销售转化"],
    ["signalto", 5, "高价值工作流，可靠性和审计能力可持续收费"],
    ["apkgo", 5, "解决多应用商店分发的重复刚需"],
    ["pake", 5, "定位单一清晰，并已获得广泛开发者采用"],
    ["siyuan", 5, "本地优先与开源生态结合，商业路径成熟"],
    ["pyvideotrans", 5, "覆盖视频翻译完整链路，社区采用度高"],
    ["hertzbeat", 5, "开源产品与云服务结合，企业价值清晰"],
    ["audiencecue", 4.5, "从免费工具延伸到可复核的受众洞察"],
    ["upload", 4.5, "切中跨 AI 记忆迁移的新需求"],
    ["璞奇", 4.5, "从内容消费进入练习和反馈闭环"],
    ["loomet", 4.5, "小众需求具体，工作流和导出能力完整"],
    ["agents sandbox", 4.5, "Agent 安全隔离是明确的基础设施需求"],
    ["dory", 4.5, "面向真实数据工作流，替代对象明确"],
    ["markstream-vue", 4.5, "解决 AI 流式渲染的新基础问题"],
    ["versionfox", 4.5, "跨语言 SDK 管理需求稳定且已有采用度"],
    ["markra", 4.5, "本地优先、跨平台并支持可控 AI 修改"],
    ["omnireach", 4.5, "多平台信息读取形成 Agent 数据入口"],
    ["reloop", 4.5, "把真实内容导入语言学习闭环"],
    ["timedsubs", 4, "本地处理与专业校验结合，定位清楚"],
    ["xtimer", 4, "远程计时场景具体，适合活动和课堂复用"],
  ].map(([name, rating, reason]) => [String(name).toLowerCase(), { rating, reason }]),
);

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

function rate(project) {
  const key = project.name.toLowerCase();
  const manual = featured.get(key);
  if (manual) return manual;
  if (project.status === "已关闭") return { rating: 1, reason: "项目已关闭，仅适合作为历史样本" };

  const text = `${project.name} ${project.description}`.toLowerCase();
  let score = project.status === "已上线" ? 2.75 : 2.25;
  const signals = [];

  if (project.description.length >= 38) score += 0.25;
  if (/\d+[+%]|\d+\s*(个|种|国|语言|平台|格式|城市|倍|秒)/i.test(text)) score += 0.25;
  if (/导出|批量|自动发布|自动重试|审计|工作流|同步|协作|分析报告|管理|监控|提醒|回测|部署/i.test(text)) {
    score += 0.5;
    signals.push("工作流较完整");
  }
  if (/本地处理|本地优先|无需上传|端到端加密|开源|self-host|自托管/i.test(text)) {
    score += 0.25;
    signals.push("信任基础较好");
  }
  if (/面向|专为|etsy|tradingview|字幕|证件照|串珠|应用商店|课堂|雅思|联合国|简历|房贷|量化/i.test(text)) {
    score += 0.5;
    signals.push("目标用户明确");
  }
  if (/一站式 ai|ai (图片|视频|音乐)?生成|提示词生成器|模型在线体验|网址导航|工具导航|账号.*中转|api 中转/i.test(text)) score -= 0.5;
  if (/去水印|答案站|粉丝版本|游戏攻略|账号租|账号及 api|破解|激活服务/i.test(text)) score -= 0.5;
  if (project.year && project.year <= 2024 && project.status === "已上线") {
    score += 0.25;
    signals.push("上线时间较长");
  }

  const rating = Math.max(1, Math.min(5, Math.round(score * 2) / 2));
  const reason = signals.length
    ? signals.slice(0, 2).join("，")
    : rating >= 3.5
      ? "解决具体问题，具备进一步验证价值"
      : "方向较常见，差异化和持续性仍需验证";
  return { rating, reason };
}

function parseProjectLine(body) {
  const link = body.match(/\[([^\]]+)\]\(([^)]+)\)/);
  if (!link) {
    const [name, ...rest] = body.split(/[：:]/);
    return { name: plainText(name), url: "", description: plainText(rest.join("：")) };
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
  };
}

async function parseBoard(board) {
  const markdown = await readFile(resolve(sourceRoot, board.file), "utf8");
  const lines = markdown.split(/\r?\n/);
  const projects = [];
  let author = "未注明";
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
    };
    Object.assign(project, rate(project));
    projects.push(project);
  });

  return projects;
}

const projects = (await Promise.all(boards.map(parseBoard))).flat();
const sourceCommit = execFileSync("git", ["rev-parse", "HEAD"], {
  cwd: sourceRoot,
  encoding: "utf8",
}).trim();

const snapshot = {
  meta: {
    source: "1c7/chinese-independent-developer",
    sourceCommit,
    generatedAt: new Date().toISOString(),
    total: projects.length,
  },
  projects,
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
console.log(`Generated ${projects.length} projects from ${sourceCommit.slice(0, 7)}.`);
