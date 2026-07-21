/**
 * 文件说明: 提供完整项目目录的搜索、筛选、排序、分页和响应式表格界面。
 */

"use client";

import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Database,
  ExternalLink,
  FilterX,
  GitFork,
  Search,
  Star,
} from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import type { Project, ProjectSnapshot } from "../lib/projects";

const PAGE_SIZE = 100;
const sourceBase = "https://github.com/1c7/chinese-independent-developer/blob/master";

type SortKey = "name" | "category" | "github-stars" | "status" | "added-at" | "board";
type SortDirection = "ascending" | "descending";
type SortState = { key: SortKey; direction: SortDirection };

const sortLabels: Record<SortKey, string> = {
  name: "项目名称",
  category: "分类",
  "github-stars": "GitHub Stars",
  status: "状态",
  "added-at": "收录日期",
  board: "版面",
};

function defaultSortDirection(key: SortKey): SortDirection {
  return key === "github-stars" || key === "added-at" ? "descending" : "ascending";
}

function statusClass(status: Project["status"]) {
  return status === "已上线" ? "status-live" : status === "开发中" ? "status-building" : "status-closed";
}

function safeProjectUrl(url: string) {
  return /^https?:\/\//i.test(url) ? url : null;
}

function addedAtSortValue(project: Project) {
  const date = project.addedAt.match(/^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/);
  if (date) return `${date[1]}-${date[2] ?? "00"}-${date[3] ?? "00"}`;
  return project.year ? `${project.year}-00-00` : "";
}

function compareProjects(left: Project, right: Project, sort: SortState) {
  const multiplier = sort.direction === "ascending" ? 1 : -1;
  let result = 0;

  if (sort.key === "github-stars") {
    if (left.githubStars === null) return right.githubStars === null ? 0 : 1;
    if (right.githubStars === null) return -1;
    result = left.githubStars - right.githubStars;
  } else if (sort.key === "added-at") {
    result = addedAtSortValue(left).localeCompare(addedAtSortValue(right));
  } else {
    const leftValue = sort.key === "name" ? left.name : left[sort.key];
    const rightValue = sort.key === "name" ? right.name : right[sort.key];
    result = leftValue.localeCompare(rightValue, "zh-CN");
  }

  return result * multiplier
    || addedAtSortValue(right).localeCompare(addedAtSortValue(left))
    || left.name.localeCompare(right.name, "zh-CN");
}

function SortableHeader({ children, column, sort, onSort }: { children: string; column: SortKey; sort: SortState; onSort: (key: SortKey) => void }) {
  const active = sort.key === column;
  const nextDirection = active
    ? sort.direction === "ascending" ? "降序" : "升序"
    : defaultSortDirection(column) === "ascending" ? "升序" : "降序";
  return (
    <th className="sortable-heading" aria-sort={active ? sort.direction : "none"}>
      <button type="button" onClick={() => onSort(column)} title={`按${children}${nextDirection}排列`}>
        <span>{children}</span>
        <span className="sort-arrow" aria-hidden="true">
          {active && (sort.direction === "ascending" ? <ArrowUp size={13} /> : <ArrowDown size={13} />)}
        </span>
      </button>
    </th>
  );
}

function formatAddedAt(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year) return "—";
  if (!month) return `${year} 年`;
  if (!day) return `${year} 年 ${month} 月`;
  return `${year} 年 ${month} 月 ${day} 日`;
}

export function ProjectExplorer({ snapshot }: { snapshot: ProjectSnapshot }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("全部分类");
  const [status, setStatus] = useState("全部状态");
  const [board, setBoard] = useState("全部版面");
  const [year, setYear] = useState("全部年份");
  const [sort, setSort] = useState<SortState>({ key: "github-stars", direction: "descending" });
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
    const result = snapshot.projects.filter((project) => {
      const searchText = `${project.name} ${project.description} ${project.author}`.toLocaleLowerCase("zh-CN");
      return (
        (!deferredQuery || searchText.includes(deferredQuery)) &&
        (category === "全部分类" || project.category === category) &&
        (status === "全部状态" || project.status === status) &&
        (board === "全部版面" || project.board === board) &&
        (year === "全部年份" || project.year === Number(year))
      );
    });

    return result.sort((left, right) => compareProjects(left, right, sort));
  }, [board, category, deferredQuery, snapshot.projects, sort, status, year]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const start = filtered.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const end = Math.min(currentPage * PAGE_SIZE, filtered.length);
  const githubProjectCount = snapshot.projects.filter((project) => project.githubUrl).length;
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
    setSort({ key: "github-stars", direction: "descending" });
    setPage(1);
  }

  function updateSort(key: SortKey) {
    setSort((current) => ({
      key,
      direction: current.key === key
        ? current.direction === "ascending" ? "descending" : "ascending"
        : defaultSortDirection(key),
    }));
    setPage(1);
  }

  function selectSort(key: SortKey) {
    setSort({ key, direction: defaultSortDirection(key) });
    setPage(1);
  }

  return (
    <main>
      <header className="site-header">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true"><Database size={19} /></span>
          <span>Vibe Coding Atlas</span>
        </div>
        <a className="source-link" href="https://github.com/xiaomingio/vibe-coding-atlas" target="_blank" rel="noreferrer">
          <GitFork size={15} aria-hidden="true" /> GitHub
        </a>
      </header>

      <section className="intro-band" aria-labelledby="page-title">
        <div className="intro-copy">
          <p className="eyebrow">中国独立开发者项目目录</p>
          <h1 id="page-title">Vibe Coding Atlas</h1>
          <p>中国独立开发者项目列表网页版，基于 1c7/chinese-independent-developer 开源清单整理，支持搜索、筛选、排序，并每日刷新项目数据和公开 GitHub Stars。</p>
        </div>
        <dl className="metrics" aria-label="项目概况">
          <div><dt>全部项目</dt><dd>{snapshot.meta.total.toLocaleString("zh-CN")}</dd></div>
          <div><dt>已上线</dt><dd>{liveCount.toLocaleString("zh-CN")}</dd></div>
          <div><dt>GitHub 仓库</dt><dd>{githubProjectCount.toLocaleString("zh-CN")}</dd></div>
          <div><dt>粗分类</dt><dd>{categories.length}</dd></div>
        </dl>
      </section>

      <section className="directory" aria-labelledby="directory-title">
        <div className="directory-heading">
          <div>
            <h2 id="directory-title">项目目录</h2>
            <p>默认按 GitHub Stars 从高到低排序。数据来源于 1c7/chinese-independent-developer，Stars 为每日快照生成时的公开数量，没有附带仓库链接的项目显示为“—”。</p>
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
            <label><span>状态</span><select value={status} onChange={(event) => updateFilter(setStatus, event.target.value)}><option>全部状态</option><option>已上线</option><option>开发中</option><option>已关闭</option></select></label>
            <label><span>年份</span><select value={year} onChange={(event) => updateFilter(setYear, event.target.value)}><option>全部年份</option>{years.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label><span>版面</span><select value={board} onChange={(event) => updateFilter(setBoard, event.target.value)}><option>全部版面</option>{boards.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label><span>排序</span><select value={sort.key} onChange={(event) => selectSort(event.target.value as SortKey)}><option value="github-stars">GitHub Stars</option><option value="added-at">收录日期</option><option value="name">项目名称</option><option value="category">分类</option><option value="status">状态</option><option value="board">版面</option></select></label>
          </div>
          <button className="reset-button" type="button" onClick={resetFilters} title="清除筛选">
            <FilterX size={17} aria-hidden="true" />
            <span>清除</span>
          </button>
        </div>

        <div className="result-summary" aria-live="polite">
          <span>找到 <strong>{filtered.length.toLocaleString("zh-CN")}</strong> 个项目</span>
          <span className="sort-indicator">
            {sort.direction === "ascending" ? <ArrowUp size={15} aria-hidden="true" /> : <ArrowDown size={15} aria-hidden="true" />}
            {sortLabels[sort.key]}{sort.direction === "ascending" ? "升序" : "降序"}
          </span>
        </div>

        <div className="table-frame">
          {visible.length ? (
            <table>
              <thead><tr><th>序号</th><SortableHeader column="name" sort={sort} onSort={updateSort}>项目</SortableHeader><SortableHeader column="category" sort={sort} onSort={updateSort}>分类</SortableHeader><SortableHeader column="github-stars" sort={sort} onSort={updateSort}>GitHub Stars</SortableHeader><SortableHeader column="status" sort={sort} onSort={updateSort}>状态</SortableHeader><SortableHeader column="added-at" sort={sort} onSort={updateSort}>收录日期</SortableHeader><SortableHeader column="board" sort={sort} onSort={updateSort}>版面</SortableHeader><th><span className="sr-only">操作</span></th></tr></thead>
              <tbody>
                {visible.map((project, index) => {
                  const projectUrl = safeProjectUrl(project.url);
                  const sourceUrl = `${sourceBase}/${project.sourceFile}#L${project.sourceLine}`;
                  return (
                    <tr key={project.id}>
                      <td className="sequence-cell" data-label="序号">{start + index}</td>
                      <td className="project-column" data-label="项目">
                        <div className="project-cell">
                          <div className="project-title-line">
                            {projectUrl ? <a href={projectUrl} target="_blank" rel="noreferrer">{project.name}</a> : <strong>{project.name}</strong>}
                          </div>
                          <p>{project.description}</p>
                          <span className="project-meta">{project.author}</span>
                        </div>
                      </td>
                      <td data-label="分类"><span className="category-label">{project.category}</span></td>
                      <td data-label="GitHub Stars">
                        {project.githubUrl ? (
                          <a className="github-stars" href={project.githubUrl} target="_blank" rel="noreferrer" title={`查看 ${project.githubRepository} 仓库`}>
                            <Star size={15} aria-hidden="true" fill="currentColor" />
                            <span>{project.githubStars?.toLocaleString("zh-CN") ?? "—"}</span>
                          </a>
                        ) : "—"}
                      </td>
                      <td data-label="状态"><span className={`status ${statusClass(project.status)}`}>{project.status}</span></td>
                      <td data-label="收录日期">{formatAddedAt(project.addedAt)}</td>
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
        <p>
          项目资料来自 <a href="https://github.com/1c7/chinese-independent-developer" target="_blank" rel="noreferrer">chinese-independent-developer</a> 仓库；GitHub Stars 来自项目附带的公开仓库链接，数据以快照生成时间为准。
        </p>
      </footer>
    </main>
  );
}
