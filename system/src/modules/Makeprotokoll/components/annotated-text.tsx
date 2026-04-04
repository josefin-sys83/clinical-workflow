import React from 'react';
import { InlineIssueMarker } from './inline-issue-marker';

interface TextAnnotation {
  start: number;
  end: number;
  issueType: 'conflict' | 'missing' | 'regulatory' | 'warning';
  severity: 'blocker' | 'high' | 'medium' | 'low';
  explanation: string;
  source?: string;
  issueId: string;
}

interface AnnotatedTextProps {
  text: string;
  annotations?: TextAnnotation[];
  className?: string;
}

export function AnnotatedText({ text, annotations = [], className = '' }: AnnotatedTextProps) {
  if (!annotations || annotations.length === 0) {
    return <p className={className}>{text}</p>;
  }

  // Sort annotations by start position
  const sortedAnnotations = [...annotations].sort((a, b) => a.start - b.start);

  const segments: React.ReactNode[] = [];
  let currentIndex = 0;

  sortedAnnotations.forEach((annotation, idx) => {
    // Add text before annotation
    if (currentIndex < annotation.start) {
      segments.push(
        <span key={`text-${idx}`}>
          {text.substring(currentIndex, annotation.start)}
        </span>
      );
    }

    // Add annotated text
    segments.push(
      <InlineIssueMarker
        key={`issue-${annotation.issueId}`}
        text={text.substring(annotation.start, annotation.end)}
        issueType={annotation.issueType}
        severity={annotation.severity}
        explanation={annotation.explanation}
        source={annotation.source}
        issueId={annotation.issueId}
      />
    );

    currentIndex = annotation.end;
  });

  // Add remaining text
  if (currentIndex < text.length) {
    segments.push(
      <span key="text-final">
        {text.substring(currentIndex)}
      </span>
    );
  }

  return <p className={`${className} relative pl-4`}>{segments}</p>;
}
