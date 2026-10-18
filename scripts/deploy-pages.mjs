/**
 * 文件说明: 构建完成后，使用本地生产发布凭据上传到 Cloudflare Pages。
 */

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const envFile = new URL("../.env.deploy.production", import.meta.url);
if (existsSync(envFile)) process.loadEnvFile(fileURLToPath(envFile));

const required = ["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_PAGES_PROJECT"];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`缺少发布变量：${missing.join(", ")}；请填写 .env.deploy.production。`);
  process.exit(1);
}

execFileSync(process.execPath, [
  fileURLToPath(new URL("../node_modules/wrangler/bin/wrangler.js", import.meta.url)),
  "pages", "deploy", "dist",
  "--project-name", process.env.CLOUDFLARE_PAGES_PROJECT,
  "--branch", process.env.CLOUDFLARE_PAGES_BRANCH || "main",
], { cwd: projectRoot, stdio: "inherit" });
