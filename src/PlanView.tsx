import { forwardRef } from 'react';
import { disclaimer } from './config';
import { formatLength } from './engine';
import type { ConceptLayout, ProjectBrief } from './models';
const colors: Record<string, string> = {
  living: '#e5cdb3',
  kitchen: '#d0dbc4',
  bedroom: '#d8deda',
  work: '#c8d9d5',
  storage: '#e5d8bb',
  loading: '#c9d9e5',
  washroom: '#d6dde4',
  retail: '#decfbc',
  custom: '#dcd5e4',
  circulation: '#f0eee8',
  stairs: '#e0e0d7',
};
export const PlanView = forwardRef<
  SVGSVGElement,
  { layout: ConceptLayout; brief: ProjectBrief; floor?: number; decorative?: boolean }
>(function PlanView({ layout: l, brief: b, floor = 0, decorative = false }, ref) {
  const scale = 500 / Math.max(l.width, l.depth),
    w = l.width * scale,
    h = l.depth * scale,
    pad = 48;
  return (
    <svg
      ref={ref}
      role="img"
      aria-label={`${b.name}, floor ${floor + 1}, draft concept layout`}
      viewBox={`0 0 ${w + pad * 2} ${h + pad * 2 + 30}`}
      xmlns="http://www.w3.org/2000/svg"
      className="plan-svg"
    >
      <title>
        {b.name} — floor {floor + 1}
      </title>
      <desc>{disclaimer} Dimensions are approximate. Walls and services excluded.</desc>
      <defs>
        <pattern
          id={`grid-${floor}-${decorative}`}
          width="12"
          height="12"
          patternUnits="userSpaceOnUse"
        >
          <path d="M 12 0 L 0 0 0 12" fill="none" stroke="#d8d9d0" strokeWidth=".5" />
        </pattern>
      </defs>
      <rect width={w + pad * 2} height={h + pad * 2 + 30} fill="#f9f8f3" />
      <rect
        x={pad}
        y={pad}
        width={w}
        height={h}
        fill={`url(#grid-${floor}-${decorative})`}
        stroke="#253e37"
        strokeWidth="3"
      />
      {l.rooms
        .filter((r) => r.floor === floor)
        .map((r) => {
          const x = pad + r.x * scale,
            y = pad + r.y * scale,
            rw = r.width * scale,
            rh = r.depth * scale;
          const font = Math.max(6, Math.min(12, rw / (Math.max(r.name.length, 12) * 0.55), rh / 4));
          return (
            <g key={r.id}>
              <rect
                x={x + 1.5}
                y={y + 1.5}
                width={Math.max(0, rw - 3)}
                height={Math.max(0, rh - 3)}
                fill={colors[r.category] || '#e5e1d6'}
                stroke="#5c6b60"
                strokeWidth=".8"
              />
              {r.kind === 'stairs' &&
                Array.from({ length: 10 }, (_, i) => (
                  <line
                    key={i}
                    x1={x + 5}
                    y1={y + (rh * (i + 1)) / 12}
                    x2={x + rw - 5}
                    y2={y + (rh * (i + 1)) / 12}
                    stroke="#9b9f94"
                    strokeWidth="1"
                  />
                ))}
              <text
                x={x + rw / 2}
                y={y + rh / 2 - font * 0.2}
                textAnchor="middle"
                fontFamily="Arial, sans-serif"
                fill="#233b34"
                fontSize={font}
                fontWeight="600"
              >
                {r.name}
              </text>
              <text
                x={x + rw / 2}
                y={y + rh / 2 + font * 1.3}
                textAnchor="middle"
                fontFamily="Arial, sans-serif"
                fill="#4e6259"
                fontSize={font * 0.8}
              >
                {formatLength(r.width, b.unit)} × {formatLength(r.depth, b.unit)}
              </text>
            </g>
          );
        })}
      <path
        d={`M${pad} 28H${pad + w} M${pad} 23v10 M${pad + w} 23v10`}
        stroke="#7c8b80"
        fill="none"
      />
      <text
        x={pad + w / 2}
        y="21"
        fontSize="11"
        textAnchor="middle"
        fill="#4b6257"
        fontFamily="Arial"
      >
        {formatLength(l.width, b.unit)}
      </text>
      <text
        transform={`translate(23 ${pad + h / 2}) rotate(-90)`}
        fontSize="11"
        textAnchor="middle"
        fill="#4b6257"
        fontFamily="Arial"
      >
        {formatLength(l.depth, b.unit)}
      </text>
      <g
        transform={`translate(${w + pad + 23} 24) rotate(${['north', 'east', 'south', 'west'].indexOf(b.north) * 90})`}
      >
        <path d="M0 -12L-4 1L0 -2L4 1Z" fill="#174e48" />
      </g>
      <text x={w + pad + 23} y="47" textAnchor="middle" fontSize="10" fill="#174e48">
        N
      </text>
      <text x={pad} y={pad + h + 23} fontFamily="Arial" fontSize="9" fill="#607267">
        {b.roads.join(' / ')} road · concept zones · floor {floor + 1}
      </text>
      <text x={pad} y={pad + h + 43} fontFamily="Arial" fontSize="9" fill="#607267">
        {disclaimer}
      </text>
    </svg>
  );
});
