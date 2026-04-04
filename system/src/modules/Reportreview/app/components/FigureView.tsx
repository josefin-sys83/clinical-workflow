import type { FigureData } from '../types/review';

interface FigureViewProps {
  figure: FigureData;
}

export function FigureView({ figure }: FigureViewProps) {
  const renderForestPlot = (data: any[]) => {
    const minCI = Math.min(...data.map((d: any) => d.ci[0]));
    const maxCI = Math.max(...data.map((d: any) => d.ci[1]));
    const range = maxCI - minCI;
    const padding = range * 0.1;
    const scale = 600 / (range + padding * 2);

    const getX = (value: number) => {
      return ((value - minCI + padding) * scale);
    };

    const nullX = getX(0);

    return (
      <div className="bg-white border border-neutral-300 rounded-md p-6">
        <svg width="700" height={data.length * 40 + 60} className="mx-auto">
          {/* Null line */}
          <line
            x1={nullX + 50}
            y1="20"
            x2={nullX + 50}
            y2={data.length * 40 + 40}
            stroke="#d4d4d4"
            strokeWidth="2"
            strokeDasharray="4 4"
          />

          {/* Data points */}
          {data.map((item: any, index: number) => {
            const y = index * 40 + 40;
            const x1 = getX(item.ci[0]) + 50;
            const x2 = getX(item.ci[1]) + 50;
            const xPoint = getX(item.estimate) + 50;

            return (
              <g key={index}>
                {/* Confidence interval line */}
                <line
                  x1={x1}
                  y1={y}
                  x2={x2}
                  y2={y}
                  stroke="#525252"
                  strokeWidth="2"
                />
                {/* Left CI cap */}
                <line
                  x1={x1}
                  y1={y - 5}
                  x2={x1}
                  y2={y + 5}
                  stroke="#525252"
                  strokeWidth="2"
                />
                {/* Right CI cap */}
                <line
                  x1={x2}
                  y1={y - 5}
                  x2={x2}
                  y2={y + 5}
                  stroke="#525252"
                  strokeWidth="2"
                />
                {/* Point estimate */}
                <rect
                  x={xPoint - 4}
                  y={y - 4}
                  width="8"
                  height="8"
                  fill={index === 0 ? '#16a34a' : '#525252'}
                />
                {/* Subgroup label */}
                <text
                  x="10"
                  y={y + 4}
                  fontSize="12"
                  fill="#525252"
                  fontWeight={index === 0 ? 'bold' : 'normal'}
                >
                  {item.subgroup}
                </text>
                {/* Effect size */}
                <text x="660" y={y + 4} fontSize="11" fill="#525252" textAnchor="end">
                  {item.estimate.toFixed(1)} ({item.ci[0].toFixed(1)}, {item.ci[1].toFixed(1)})
                </text>
              </g>
            );
          })}

          {/* X-axis labels */}
          <text x={getX(-12) + 50} y={data.length * 40 + 55} fontSize="11" fill="#737373" textAnchor="middle">
            -12
          </text>
          <text x={getX(-6) + 50} y={data.length * 40 + 55} fontSize="11" fill="#737373" textAnchor="middle">
            -6
          </text>
          <text x={nullX + 50} y={data.length * 40 + 55} fontSize="11" fill="#737373" textAnchor="middle">
            0
          </text>
          
          {/* Axis labels */}
          <text x="350" y={data.length * 40 + 75} fontSize="12" fill="#525252" textAnchor="middle" fontStyle="italic">
            Favors Treatment ← Mean Difference (95% CI) → Favors Control
          </text>
        </svg>
      </div>
    );
  };

  return (
    <div className="my-6">
      <div className="mb-3">
        <p className="text-sm font-medium text-neutral-900 mb-1">{figure.id}</p>
        <p className="text-sm text-neutral-700 mb-1">{figure.caption}</p>
        <p className="text-xs text-neutral-500 italic">{figure.reference}</p>
      </div>

      {figure.type === 'forest-plot' && figure.data && renderForestPlot(figure.data)}
    </div>
  );
}
