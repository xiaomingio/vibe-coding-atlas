/**
 * 文件说明: 从生产部署 env 读取 R2 凭据白名单，并写入当前 GitHub 仓库的 Actions Secrets。
 */

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";

const requiredSecrets = ["CLOUDFLARE_ACCOUNT_ID", "R2_BUCKET", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY"];

function parseArgs(argv) {
  const args = { envFile: fileURLToPath(new URL("../.env.deploy.production", import.meta.url)), repo: "" };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--env-file") {
      args.envFile = argv[index + 1] ?? "";
      if (!args.envFile) throw new Error("--env-file 需要文件路径。");
      index += 1;
    } else if (value === "--repo") {
      args.repo = argv[index + 1] ?? "";
      if (!args.repo) throw new Error("--repo 需要 owner/name。");
      index += 1;
    } else {
      throw new Error(`未知参数：${value}`);
    }
  }
  return args;
}

function resolveRepo(explicitRepo) {
  if (explicitRepo) return explicitRepo;
  if (process.env.GITHUB_REPOSITORY) return process.env.GITHUB_REPOSITORY;
  return execFileSync("gh", ["repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
}

const args = parseArgs(process.argv.slice(2));
const envPath = resolve(args.envFile);

if (!existsSync(envPath)) {
  console.error(`找不到 ${args.envFile}，请参考 .env.deploy.example 创建部署配置。`);
  process.exit(1);
}

const fileValues = parseEnv(readFileSync(envPath, "utf8"));
const envValues = new Map(requiredSecrets.map((key) => [key, process.env[key] ?? fileValues[key]]));
const missing = requiredSecrets.filter((key) => !envValues.get(key));
if (missing.length > 0) {
  console.error(`缺少必要变量：${missing.join(", ")}`);
  process.exit(1);
}

let repo;
try {
  repo = resolveRepo(args.repo);
} catch {
  console.error("无法识别 GitHub 仓库，请先运行 gh auth login，或传入 --repo owner/name。");
  process.exit(1);
}

for (const key of requiredSecrets) {
  const result = spawnSync("gh", ["secret", "set", key, "--repo", repo], {
    encoding: "utf8",
    input: envValues.get(key),
    stdio: ["pipe", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    console.error(`写入 ${key} 失败：${result.stderr.trim() || result.stdout.trim()}`);
    process.exit(result.status ?? 1);
  }
  console.log(`已写入 GitHub Secret: ${key}`);
}

console.log(`完成：Secrets 已写入 ${repo}`);
