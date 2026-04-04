import { InlineAIMarker } from './InlineAIMarker';
import { ValidationFinding } from '../types/index';

interface TextWithInlineMarkersProps {
  text: string;
  findings: ValidationFinding[];
  className?: string;
  style?: React.CSSProperties;
  onNavigateToSection?: (sectionId: string) => void;
}

export function TextWithInlineMarkers({ 
  text, 
  findings, 
  className,
  style,
  onNavigateToSection 
}: TextWithInlineMarkersProps) {
  // Filter findings that have text positions (inline markers)
  const inlineFindings = findings
    .filter(f => !f.resolved && f.textPosition)
    .sort((a, b) => (a.textPosition?.start || 0) - (b.textPosition?.start || 0));

  if (inlineFindings.length === 0) {
    // No inline markers, render text as-is
    return <div className={className} style={style}>{text}</div>;
  }

  // Build segments with markers
  const segments: React.ReactNode[] = [];
  let lastIndex = 0;

  inlineFindings.forEach((finding, idx) => {
    const { start, end, markedText } = finding.textPosition!;

    // Add text before this marker
    if (start > lastIndex) {
      segments.push(text.substring(lastIndex, start));
    }

    // Add marker
    segments.push(
      <InlineAIMarker
        key={finding.id}
        text={markedText}
        type={finding.type}
        title={finding.title}
        description={finding.description}
        relatedSection={finding.relatedSectionTitle}
        onNavigateToSection={
          finding.relatedSectionId && onNavigateToSection
            ? () => onNavigateToSection(finding.relatedSectionId!)
            : undefined
        }
      />
    );

    lastIndex = end;
  });

  // Add remaining text after last marker
  if (lastIndex < text.length) {
    segments.push(text.substring(lastIndex));
  }

  return (
    <div className={className} style={style}>
      {segments}
    </div>
  );
}
