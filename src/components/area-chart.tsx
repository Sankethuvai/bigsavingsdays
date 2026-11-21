type Point = { label: string; value: number };

export function AreaChart({
  data,
  height = 180,
  id = "area",
  compact = false,
}: {
  data: Point[];
  height?: number;
  id?: string;
  compact?: boolean;
}) {
  const width = 720;
  const padX = compact ? 6 : 16;
  const padTop = 10;
  const padBottom = compact ? 8 : 24;
  const max = Math.max(...data.map((d) => d.value), 1);
  const stepX = (width - padX * 2) / Math.max(data.length - 1, 1);

  const points = data.map((d, i) => {
    const x = padX + i * stepX;
    const y = padTop + (1 - d.value / max) * (height - padTop - padBottom);
    return { x, y, ...d };
  });

  const line = points
    .map((p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      const prev = points[i - 1];
      const cx = (prev.x + p.x) / 2;
      return `C ${cx} ${prev.y}, ${cx} ${p.y}, ${p.x} ${p.y}`;
    })
    .join(" ");

  const area = `${line} L ${points[points.length - 1]?.x ?? padX} ${height - padBottom} L ${points[0]?.x ?? padX} ${height - padBottom} Z`;
  const ticks = 4;

  return (
    <svg className="chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Clicks over time">
      <defs>
        <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--lime-deep)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--lime-deep)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g className="chart-grid">
        {Array.from({ length: ticks + 1 }).map((_, i) => {
          const y = padTop + (i / ticks) * (height - padTop - padBottom);
          return <line key={i} x1={padX} x2={width - padX} y1={y} y2={y} />;
        })}
      </g>
      <path d={area} fill={`url(#${id}-fill)`} />
      <path d={line} className="chart-line" />
      {points.length > 0 && (
        <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="3.5" fill="var(--lime-deep)" stroke="var(--surface)" strokeWidth="2" />
      )}
      {!compact &&
        [0, Math.floor(data.length / 2), data.length - 1].map((idx) =>
          data[idx] ? (
            <text key={idx} className="chart-label" x={padX + idx * stepX} y={height - 6} textAnchor={idx === 0 ? "start" : idx === data.length - 1 ? "end" : "middle"}>
              {data[idx].label}
            </text>
          ) : null
        )}
    </svg>
  );
}
