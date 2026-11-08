/**
 * 文件说明: 按项目介绍、作者账号及公开链接匹配目录搜索词。
 */

import type { Project } from "./projects";

type SearchableProject = Pick<Project,
  "name" | "description" | "author" | "authorGithubUrl" | "url" | "githubRepository" | "githubUrl"
>;

export function matchesProjectQuery(project: SearchableProject, query: string) {
  const terms = query.trim().toLocaleLowerCase("zh-CN").split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;

  const fields = [
    project.name,
    project.description,
    project.author,
    project.authorGithubUrl,
    project.url,
    project.githubRepository,
    project.githubUrl,
  ].map((value) => (value ?? "").toLocaleLowerCase("zh-CN"));

  return terms.every((term) => fields.some((field) => field.includes(term)))
    || fields[0].replace(/\s+/g, "").includes(terms.join(""));
}
