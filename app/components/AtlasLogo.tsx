/**
 * 文件说明: 提供 Vibe Coding Atlas 的品牌标识图形。
 */

export function AtlasLogo({ size = 19 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M12.1 7.2 5.1 16l7 8.8" stroke="currentColor" strokeWidth="2.45" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19.9 7.2 26.9 16l-7 8.8" stroke="currentColor" strokeWidth="2.45" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 9.8 17.55 14.45 22.2 16 17.55 17.55 16 22.2 14.45 17.55 9.8 16 14.45 14.45 16 9.8Z" fill="currentColor" />
    </svg>
  );
}
