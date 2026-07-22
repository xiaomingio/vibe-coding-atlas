/**
 * 文件说明: 从本地 Cloudflare env 文件读取 R2 发布凭据，并写入当前 GitHub 仓库的 Actions Secrets。
 */

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const requiredSecrets = ["CLOUDFLARE_ACCOUNT_ID", "R2_BUCKET", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY"];

function parseArgs(argv) {
  const args = { envFile: ".env.cloudflare", repo: "" };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--env-file") {
      args.envFile = argv[index + 1] ?? "";
      index += 1;
    } else if (value === "--repo") {
      args.repo = argv[index + 1] ?? "";
      index += 1;
    }
  }
  return args;
}

function parseEnvFile(path) {
  const values = new Map();
  const body = readFileSync(path, "utf8");
  for (const line of body.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const rawValue = match[2].trim();
    const unquoted = rawValue.replace(/^(['"])(.*)\1$/, "$2");
    values.set(match[1], unquoted);
  }
  return values;
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
  console.error(`找不到 ${args.envFile}，请先创建本地 Cloudflare env 文件。`);
  process.exit(1);
}

const envValues = parseEnvFile(envPath);
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
