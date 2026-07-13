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
