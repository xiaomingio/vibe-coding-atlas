/**
 * 文件说明: 提供完整项目目录的搜索、筛选、排序、分页和响应式表格界面。
 */

"use client";

import {
  ArrowDownAZ,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Database,
  ExternalLink,
  FilterX,
  Search,
  Sparkles,
  Star,
} from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import type { Project, ProjectSnapshot } from "../lib/projects";

const PAGE_SIZE = 50;
const sourceBase = "https://github.com/1c7/chinese-independent-developer/blob/master";

type SortKey = "rating" | "recent" | "name";

function statusClass(status: Project["status"]) {
  return status === "已上线" ? "status-live" : status === "开发中" ? "status-building" : "status-closed";
}

function safeProjectUrl(url: string) {
  return /^https?:\/\//i.test(url) ? url : null;
}

function Rating({ value }: { value: number }) {
  return (
    <span className="rating" aria-label={`${value} 星`} title={`${value} 星`}>
      <Star size={15} aria-hidden="true" fill="currentColor" />
      <span>{value.toFixed(1)}</span>
    </span>
  );
}

export function ProjectExplorer({ snapshot }: { snapshot: ProjectSnapshot }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("全部分类");
  const [status, setStatus] = useState("全部状态");
  const [board, setBoard] = useState("全部版面");
  const [year, setYear] = useState("全部年份");
  const [rating, setRating] = useState("全部星级");
  const [sort, setSort] = useState<SortKey>("rating");
  const [page, setPage] = useState(1);
  const deferredQuery = useDeferredValue(query.trim().toLocaleLowerCase("zh-CN"));

  const categories = useMemo(
    () => [...new Set(snapshot.projects.map((project) => project.category))].sort((a, b) => a.localeCompare(b, "zh-CN")),
    [snapshot.projects],
  );
  const years = useMemo(
    () => [...new Set(snapshot.projects.map((project) => project.year).filter((value): value is number => Boolean(value)))].sort((a, b) => b - a),
    [snapshot.projects],
  );
  const boards = useMemo(
    () => [...new Set(snapshot.projects.map((project) => project.board))],
    [snapshot.projects],
  );

  const filtered = useMemo(() => {
    const minimumRating = rating === "5 星" ? 5 : rating === "4.5 星以上" ? 4.5 : rating === "4 星以上" ? 4 : 0;
    const result = snapshot.projects.filter((project) => {
      const searchText = `${project.name} ${project.description} ${project.author}`.toLocaleLowerCase("zh-CN");
      return (
        (!deferredQuery || searchText.includes(deferredQuery)) &&
        (category === "全部分类" || project.category === category) &&
        (status === "全部状态" || project.status === status) &&
        (board === "全部版面" || project.board === board) &&
        (year === "全部年份" || project.year === Number(year)) &&
        project.rating >= minimumRating
      );
    });

    return result.sort((left, right) => {
      if (sort === "name") return left.name.localeCompare(right.name, "zh-CN");
      if (sort === "recent") return (right.year ?? 0) - (left.year ?? 0) || right.sourceLine - left.sourceLine;
      return right.rating - left.rating || (right.year ?? 0) - (left.year ?? 0) || left.name.localeCompare(right.name, "zh-CN");
    });
  }, [board, category, deferredQuery, rating, snapshot.projects, sort, status, year]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const start = filtered.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const end = Math.min(currentPage * PAGE_SIZE, filtered.length);
  const recommendedCount = snapshot.projects.filter((project) => project.rating >= 4.5).length;
  const liveCount = snapshot.projects.filter((project) => project.status === "已上线").length;

  function updateFilter(setter: (value: string) => void, value: string) {
    setter(value);
    setPage(1);
  }

  function resetFilters() {
    setQuery("");
    setCategory("全部分类");
    setStatus("全部状态");
    setBoard("全部版面");
    setYear("全部年份");
    setRating("全部星级");
    setSort("rating");
    setPage(1);
  }

  return (
    <main>
      <header className="site-header">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true"><Database size={19} /></span>
          <span>Vibe Coding Atlas</span>
        </div>
        <a className="source-link" href="https://github.com/1c7/chinese-independent-developer" target="_blank" rel="noreferrer">
          数据来源 <ArrowUpRight size={15} aria-hidden="true" />
        </a>
      </header>

      <section className="intro-band" aria-labelledby="page-title">
        <div className="intro-copy">
          <p className="eyebrow">中国独立开发者项目目录</p>
          <h1 id="page-title">从 {snapshot.meta.total.toLocaleString("zh-CN")} 个项目里，找到值得研究的方向</h1>
          <p>完整收录主版面、程序员、游戏和历史归档项目。分类与星级用于快速初筛，重要判断请回到项目原站复核。</p>
        </div>
        <dl className="metrics" aria-label="项目概况">
          <div><dt>全部项目</dt><dd>{snapshot.meta.total.toLocaleString("zh-CN")}</dd></div>
          <div><dt>已上线</dt><dd>{liveCount.toLocaleString("zh-CN")}</dd></div>
          <div><dt>4.5 星以上</dt><dd>{recommendedCount.toLocaleString("zh-CN")}</dd></div>
          <div><dt>粗分类</dt><dd>{categories.length}</dd></div>
        </dl>
      </section>

      <section className="directory" aria-labelledby="directory-title">
        <div className="directory-heading">
          <div>
            <h2 id="directory-title">项目目录</h2>
            <p>默认按推荐度排序。星级综合定位清晰度、工作流完整性、差异化与持续性粗评，不代表营收或投资建议。</p>
          </div>
          <span className="snapshot-note">数据快照 · {snapshot.meta.sourceCommit.slice(0, 7)}</span>
        </div>

        <div className="filter-panel" aria-label="筛选项目">
          <label className="search-field">
            <Search size={18} aria-hidden="true" />
            <span className="sr-only">搜索项目</span>
            <input
              type="search"
              value={query}
              onChange={(event) => { setQuery(event.target.value); setPage(1); }}
              placeholder="搜索项目、介绍或作者"
            />
          </label>
          <div className="select-grid">
            <label><span>分类</span><select value={category} onChange={(event) => updateFilter(setCategory, event.target.value)}><option>全部分类</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label><span>星级</span><select value={rating} onChange={(event) => updateFilter(setRating, event.target.value)}><option>全部星级</option><option>4 星以上</option><option>4.5 星以上</option><option>5 星</option></select></label>
            <label><span>状态</span><select value={status} onChange={(event) => updateFilter(setStatus, event.target.value)}><option>全部状态</option><option>已上线</option><option>开发中</option><option>已关闭</option></select></label>
            <label><span>年份</span><select value={year} onChange={(event) => updateFilter(setYear, event.target.value)}><option>全部年份</option>{years.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label><span>版面</span><select value={board} onChange={(event) => updateFilter(setBoard, event.target.value)}><option>全部版面</option>{boards.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label><span>排序</span><select value={sort} onChange={(event) => { setSort(event.target.value as SortKey); setPage(1); }}><option value="rating">推荐度优先</option><option value="recent">最新收录</option><option value="name">名称 A–Z</option></select></label>
          </div>
          <button className="reset-button" type="button" onClick={resetFilters} title="清除筛选">
            <FilterX size={17} aria-hidden="true" />
            <span>清除</span>
          </button>
        </div>

        <div className="result-summary" aria-live="polite">
          <span>找到 <strong>{filtered.length.toLocaleString("zh-CN")}</strong> 个项目</span>
          <span className="sort-indicator"><ArrowDownAZ size={15} aria-hidden="true" /> {sort === "rating" ? "推荐度优先" : sort === "recent" ? "最新收录" : "名称排序"}</span>
        </div>

        <div className="table-frame">
          {visible.length ? (
            <table>
              <thead><tr><th>项目</th><th>分类</th><th>星级</th><th>状态</th><th>年份</th><th>版面</th><th><span className="sr-only">操作</span></th></tr></thead>
              <tbody>
                {visible.map((project) => {
                  const projectUrl = safeProjectUrl(project.url);
                  const sourceUrl = `${sourceBase}/${project.sourceFile}#L${project.sourceLine}`;
                  return (
                    <tr key={project.id} className={project.rating >= 4.5 ? "recommended-row" : undefined}>
                      <td data-label="项目">
                        <div className="project-cell">
                          <div className="project-title-line">
                            {project.rating >= 4.5 && <Sparkles size={15} aria-label="重点推荐" className="recommended-icon" />}
                            {projectUrl ? <a href={projectUrl} target="_blank" rel="noreferrer">{project.name}</a> : <strong>{project.name}</strong>}
                          </div>
                          <p>{project.description}</p>
                          <span className="project-meta">{project.author} · {project.reason}</span>
                        </div>
                      </td>
                      <td data-label="分类"><span className="category-label">{project.category}</span></td>
                      <td data-label="星级"><Rating value={project.rating} /></td>
                      <td data-label="状态"><span className={`status ${statusClass(project.status)}`}>{project.status}</span></td>
                      <td data-label="年份">{project.year ?? "—"}</td>
                      <td data-label="版面">{project.board}</td>
                      <td data-label="操作">
                        <div className="row-actions">
                          <a href={sourceUrl} target="_blank" rel="noreferrer" title="查看来源"><ExternalLink size={16} aria-hidden="true" /><span className="sr-only">查看 {project.name} 的来源</span></a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">
              <Search size={24} aria-hidden="true" />
              <h3>没有找到匹配项目</h3>
              <p>尝试减少筛选条件或更换关键词。</p>
              <button type="button" onClick={resetFilters}>清除筛选</button>
            </div>
          )}
        </div>

        {filtered.length > PAGE_SIZE && (
          <nav className="pagination" aria-label="项目分页">
            <span>第 {start}–{end} 项，共 {filtered.length.toLocaleString("zh-CN")} 项</span>
            <div className="page-buttons">
              <button type="button" onClick={() => setPage(1)} disabled={currentPage === 1} title="第一页"><ChevronsLeft size={17} /><span className="sr-only">第一页</span></button>
              <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={currentPage === 1} title="上一页"><ChevronLeft size={17} /><span className="sr-only">上一页</span></button>
              <span>{currentPage} / {pageCount}</span>
              <button type="button" onClick={() => setPage((value) => Math.min(pageCount, value + 1))} disabled={currentPage === pageCount} title="下一页"><ChevronRight size={17} /><span className="sr-only">下一页</span></button>
              <button type="button" onClick={() => setPage(pageCount)} disabled={currentPage === pageCount} title="最后一页"><ChevronsRight size={17} /><span className="sr-only">最后一页</span></button>
            </div>
          </nav>
        )}
      </section>

      <footer>
        <p>项目事实来自 chinese-independent-developer 仓库；分类、推荐理由和星级为辅助判断，建议结合原站、用户反馈与商业数据复核。</p>
      </footer>
    </main>
  );
}
