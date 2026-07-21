<p align="center">
  <img src="public/favicon.svg" alt="Vibe Coding Atlas 品牌标识" width="128" height="128">
</p>

<h1 align="center">Vibe Coding Atlas</h1>

> 品牌标识结合了代码括号和双手捧着小火星的意象，寓意开发者用代码托起新的灵感与创意。

收录和整理中国独立开发者项目，提供搜索、筛选、排序、精确收录日期和项目所附公开仓库的 GitHub Stars。数据来源：[chinese-independent-developer](https://github.com/1c7/chinese-independent-developer)。

正式站点：<https://vibecoding.aicake.io>

## 本地运行

```bash
npm install
git clone --depth=1 https://github.com/1c7/chinese-independent-developer.git source
npm run data:generate
npm run dev
```

默认从项目内的 `source/` 读取上游清单，也可以通过 `SOURCE_REPO` 指定已有 checkout 路径。`npm run data:generate` 会把本地快照写入被忽略的 `public/data/projects.json`，方便 `npm run dev` 通过 `/data/projects.json` 加载。设置 `GITHUB_TOKEN` 或 `GH_TOKEN` 后会通过 GitHub 官方 API 刷新 Stars；没有 Token 时保留已有 Stars 快照。

本机已登录 GitHub CLI 时，`npm run data:generate` 会在没有 `GITHUB_TOKEN` / `GH_TOKEN` 的情况下自动尝试 `gh auth token`，临时用于刷新 GitHub Stars。Token 不会写入项目文件；远程 GitHub Actions 仍使用自动注入的 `${{ github.token }}`。

## 验证与构建

```bash
npm run typecheck
npm run lint
npm test
```

`npm run build` 生成可直接发布到 Cloudflare Pages 的 `dist/`。项目资料来自上游仓库，GitHub Stars 仅对应清单中能够识别出的公开仓库链接。

## 自动更新

GitHub Actions 每天凌晨 4:00（北京时间）检查
[chinese-independent-developer](https://github.com/1c7/chinese-independent-developer) 的 `master` 分支，重新生成项目资料并刷新 GitHub Stars。快照有变化时提交到 `data` 分支的 `projects.json`，`main` 分支只保存网站代码。

工作流也可以在 GitHub Actions 页面手动触发；它只使用 GitHub 自动提供的 `GITHUB_TOKEN`，不需要在 GitHub 配置 Cloudflare 凭据。

## 运行流程

```mermaid
flowchart TD
  upstream["1c7/chinese-independent-developer master"] --> action["GitHub Actions 每天 04:00 北京时间刷新"]
  action --> generate["运行 npm run data:generate"]
  generate --> dataBranch["提交 projects.json 到 data 分支"]
  mainBranch["main 分支保存网页代码"] --> pages["Cloudflare Pages 构建 dist"]
  pages --> browser["用户访问 vibecoding.aicake.io"]
  browser --> endpoint["请求 /data/projects.json"]
  endpoint --> function["Pages Function 读取 GitHub data 分支"]
  function --> dataBranch
  dataBranch --> browser
```

## 部署

Cloudflare Pages 项目 `vibe-coding-atlas` 通过 GitHub Integration 跟踪 `main` 分支，使用 `npm run build` 构建并发布 `dist/`，再由 Pages Function 提供同源 `/data/projects.json` 数据接口。GitHub 不保存 Cloudflare API Token 或 Account ID。

## License

项目代码采用 [GPL-3.0](./LICENSE) 开源。

`Vibe Coding Atlas` 的名称、Logo 和域名不随代码授权。如果基于本项目 fork 或二次开发成自己的产品，请使用自己的名称、Logo 和域名，并注明项目来源，避免和本站混淆。
