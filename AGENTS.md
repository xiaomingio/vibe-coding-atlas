# 项目说明

## 入口真源

- 页面入口：`index.html`、`app/main.tsx`
- 交互界面：`app/components/ProjectExplorer.tsx`
- 项目数据类型：`app/lib/projects.ts`
- 项目快照：`app/data/projects.json`
- 快照生成：`scripts/generate-projects.mjs`
- 全局样式：`app/globals.css`

## 数据更新

运行 `npm run data:generate` 从 `chinese-independent-developer` 仓库重新生成快照。不要手工修改 `app/data/projects.json`，分类与评分规则以生成脚本为唯一真源。

## 质量门槛

提交前运行 `npm run typecheck`、`npm run lint` 和 `npm test`。生产构建产物输出到 `dist/`，发布目标为 Cloudflare Pages 项目 `vibe-coding-atlas`。
