import React, { useState } from 'react';

interface TextSegment {
  text: string;
  type?: 'conflict' | 'missing' | 'normal';
  tooltip?: string;
}

interface HighlightedTextProps {
  content: string;
  highlights?: {
    type: 'conflict' | 'missing';
    startIndex: number;
    endIndex: number;
    tooltip: string;
  }[];
}

export function HighlightedText({ content, highlights = [] }: HighlightedTextProps) {
  const [activeTooltip, setActiveTooltip] = useState<number | null>(null);

  if (!highlights || highlights.length === 0) {
    return <span className="text-sm text-slate-900 leading-relaxed">{content}</span>;
  }

  // Sort highlights by start index
  const sortedHighlights = [...highlights].sort((a, b) => a.startIndex - b.startIndex);

  // Build segments
  const segments: TextSegment[] = [];
  let lastIndex = 0;

  sortedHighlights.forEach((highlight) => {
    // Add normal text before highlight
    if (highlight.startIndex > lastIndex) {
      segments.push({
        text: content.substring(lastIndex, highlight.startIndex),
        type: 'normal'
      });
    }

    // Add highlighted text
    segments.push({
      text: content.substring(highlight.startIndex, highlight.endIndex),
      type: highlight.type,
      tooltip: highlight.tooltip
    });

    lastIndex = highlight.endIndex;
  });

  // Add remaining normal text
  if (lastIndex < content.length) {
    segments.push({
      text: content.substring(lastIndex),
      type: 'normal'
    });
  }

  return (
    <span className="text-sm text-slate-900 leading-relaxed">
      {segments.map((segment, index) => {
        if (segment.type === 'normal') {
          return <span key={index}>{segment.text}</span>;
        }

        if (segment.type === 'conflict') {
          return (
            <span
              key={index}
              className="relative inline-block cursor-help"
              onMouseEnter={() => setActiveTooltip(index)}
              onMouseLeave={() => setActiveTooltip(null)}
            >
              <span className="border-b-2 border-red-500 bg-red-50 text-red-900">
                {segment.text}
              </span>
              {activeTooltip === index && segment.tooltip && (
                <span className="absolute bottom-full left-0 mb-1 px-2 py-1 bg-red-900 text-white text-xs rounded shadow-lg whitespace-nowrap z-10">
                  🔴 {segment.tooltip}
                  <span className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-red-900" />
                </span>
              )}
            </span>
          );
        }

        if (segment.type === 'missing') {
          return (
            <span
              key={index}
              className="relative inline-block cursor-help"
              onMouseEnter={() => setActiveTooltip(index)}
              onMouseLeave={() => setActiveTooltip(null)}
            >
              <span className="bg-orange-100 text-orange-900 px-1 rounded">
                {segment.text}
              </span>
              {activeTooltip === index && segment.tooltip && (
                <span className="absolute bottom-full left-0 mb-1 px-2 py-1 bg-orange-900 text-white text-xs rounded shadow-lg whitespace-nowrap z-10">
                  🟠 {segment.tooltip}
                  <span className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-orange-900" />
                </span>
              )}
            </span>
          );
        }

        return <span key={index}>{segment.text}</span>;
      })}
    </span>
  );
}
