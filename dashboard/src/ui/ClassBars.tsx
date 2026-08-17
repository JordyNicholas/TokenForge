import { formatTokens, type ClassBucket } from "../domain";

export function ClassBars({ buckets }: { buckets: ClassBucket[] }) {
  const max = buckets[0]?.estTokens ?? 1;
  return (
    <ul className="class-bars">
      {buckets.map((bucket) => {
        const width = Math.max(8, (bucket.estTokens / max) * 100);
        return (
          <li key={bucket.fileClass}>
            <span className="class-label">{bucket.fileClass}</span>
            <span className="class-bar-track">
              <span className="class-bar" style={{ width: `${width}%` }} />
            </span>
            <span className="num">{formatTokens(bucket.estTokens)}</span>
          </li>
        );
      })}
    </ul>
  );
}
