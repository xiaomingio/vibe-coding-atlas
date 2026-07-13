/**
 * 文件说明: 定义项目目录快照及网页展示使用的数据类型。
 */

export type ProjectStatus = "已上线" | "开发中" | "已关闭";

export type Project = {
  id: string;
  name: string;
  url: string;
  description: string;
  author: string;
  year: number | null;
  addedAt: string;
  status: ProjectStatus;
  board: string;
  category: string;
  sourceFile: string;
  sourceLine: number;
  githubRepository: string | null;
  githubUrl: string | null;
  githubStars: number | null;
};

export type ProjectSnapshot = {
  meta: {
    source: string;
    sourceCommit: string;
    generatedAt: string;
    githubStarsFetchedAt: string | null;
    githubRepositoriesDetected: number;
    githubRepositoriesResolved: number;
    total: number;
  };
  projects: Project[];
};
