# Vibe Coding Atlas

把 [chinese-independent-developer](https://github.com/1c7/chinese-independent-developer) 的项目清单整理成可搜索、筛选、排序的静态网页目录，并提供粗分类、星级和推荐理由用于快速初筛。

正式站点：<https://vibecoding.aicake.io>

## 本地运行

```bash
npm install
npm run data:generate
npm run dev
```

默认从相邻的 `../third_party/chinese-independent-developer` 读取数据，也可以通过 `SOURCE_REPO` 指定仓库路径。

## 验证与构建

```bash
npm run typecheck
npm run lint
npm test
```

`npm run build` 生成可直接发布到 Cloudflare Pages 的 `dist/`。项目事实来自上游仓库快照；分类、推荐理由和星级属于启发式判断，不代表营收、用户规模或投资建议。

## 自动更新

GitHub Actions 每周一 10:15（北京时间）检查
[chinese-independent-developer](https://github.com/1c7/chinese-independent-developer) 的 `master` 分支。上游 commit 发生变化时，工作流会重新生成并验证 `app/data/projects.json`，然后把新快照提交到 `main`。Cloudflare Pages 通过 GitHub Integration 检测该提交并自动构建发布。

工作流也可以在 GitHub Actions 页面手动触发；它只使用 GitHub 自动提供的 `GITHUB_TOKEN`，不需要在 GitHub 配置 Cloudflare 凭据。

## 部署

Cloudflare Pages 项目 `vibe-coding-atlas-web` 通过 GitHub Integration 跟踪 `main` 分支，使用 `npm run build` 构建并发布 `dist/`。GitHub 不保存 Cloudflare API Token 或 Account ID。
