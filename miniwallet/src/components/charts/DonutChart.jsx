import { formatVND } from '../../utils/format';

/**
 * Biểu đồ tròn rỗng vẽ bằng SVG, không dùng thư viện.
 * Mỗi phần là một vòng tròn dùng stroke-dasharray: độ dài nét = tỉ lệ * chu vi.
 * data: [{ key, label, value, color }]
 */
export default function DonutChart({ data, size = 180, thickness = 24, hidden = false, centerLabel = 'Tổng' }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  const percent = (value) => (total ? Math.round((value / total) * 100) : 0);

  let offset = 0;
  const segments = data.map((d) => {
    const length = total ? (d.value / total) * circumference : 0;
    const segment = { ...d, length, offset };
    offset += length;
    return segment;
  });

  const description = data.map((d) => `${d.label} ${percent(d.value)}%`).join(', ');

  return (
    <div className="donut-chart">
      <div className="donut" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Tỉ lệ chi tiêu: ${description}`}>
          <g transform={`rotate(-90 ${center} ${center})`}>
            <circle cx={center} cy={center} r={radius} fill="none" stroke="var(--color-surface-2)" strokeWidth={thickness} />
            {segments.map((s) => (
              <circle
                key={s.key}
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={s.color}
                strokeWidth={thickness}
                strokeDasharray={`${s.length} ${circumference - s.length}`}
                strokeDashoffset={-s.offset}
              >
                <title>{`${s.label}: ${hidden ? '••••••' : formatVND(s.value)}`}</title>
              </circle>
            ))}
          </g>
        </svg>
        <div className="donut__center">
          <span className="donut__label">{centerLabel}</span>
          <strong className="donut__value">{hidden ? '••••••' : formatVND(total)}</strong>
        </div>
      </div>

      <ul className="legend">
        {data.map((d) => (
          <li key={d.key} className="legend__item">
            <span className="legend__dot" style={{ backgroundColor: d.color }} aria-hidden="true" />
            <span className="legend__label">{d.label}</span>
            <span className="legend__value">{hidden ? '•••' : formatVND(d.value)}</span>
            <span className="legend__percent">{percent(d.value)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
