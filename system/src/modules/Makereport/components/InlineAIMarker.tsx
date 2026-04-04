import { useState, useRef, useEffect } from 'react';
import { AlertCircle, AlertTriangle, Info, Sparkles, ExternalLink } from 'lucide-react';
import { createPopper, Instance } from '@popperjs/core';

interface InlineAIMarkerProps {
  text: string;
  type: 'info' | 'warning' | 'blocker';
  title: string;
  description: string;
  relatedSection?: string;
  onNavigateToSection?: () => void;
}

export function InlineAIMarker({ 
  text, 
  type, 
  title, 
  description, 
  relatedSection,
  onNavigateToSection 
}: InlineAIMarkerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const markerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const popperInstance = useRef<Instance | null>(null);

  useEffect(() => {
    if (isVisible && markerRef.current && tooltipRef.current) {
      popperInstance.current = createPopper(markerRef.current, tooltipRef.current, {
        placement: 'top',
        modifiers: [
          {
            name: 'offset',
            options: {
              offset: [0, 8],
            },
          },
          {
            name: 'preventOverflow',
            options: {
              padding: 8,
            },
          },
        ],
      });
    }

    return () => {
      if (popperInstance.current) {
        popperInstance.current.destroy();
        popperInstance.current = null;
      }
    };
  }, [isVisible]);

  const getStyles = () => {
    switch (type) {
      case 'blocker':
        return {
          color: '#DC2626',
          borderColor: '#FEE2E2',
          bgColor: '#FEF2F2',
          underlineColor: '#DC2626',
        };
      case 'warning':
        return {
          color: '#F59E0B',
          borderColor: '#FEF3C7',
          bgColor: '#FFFBEB',
          underlineColor: '#F59E0B',
        };
      case 'info':
        return {
          color: '#0EA5E9',
          borderColor: '#BAE6FD',
          bgColor: '#F0F9FF',
          underlineColor: '#0EA5E9',
        };
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'blocker':
        return <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />;
      case 'info':
        return <Info className="w-3.5 h-3.5 flex-shrink-0" />;
    }
  };

  const styles = getStyles();

  return (
    <>
      <span
        ref={markerRef}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="cursor-help transition-all"
        style={{
          borderBottom: `2px dotted ${styles.underlineColor}`,
          backgroundColor: isVisible ? styles.bgColor : 'transparent',
          padding: isVisible ? '0 2px' : '0',
          borderRadius: '2px',
        }}
      >
        {text}
      </span>

      {isVisible && (
        <div
          ref={tooltipRef}
          className="z-50 shadow-lg rounded border"
          style={{
            backgroundColor: 'white',
            borderColor: styles.borderColor,
            maxWidth: '320px',
            minWidth: '240px',
          }}
        >
          <div className="p-3">
            {/* Header with AI label */}
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-[#E5E7EB]">
              <Sparkles className="w-3 h-3 text-[#0EA5E9]" />
              <span 
                className="text-[#6B7280]"
                style={{ 
                  fontSize: '10px', 
                  fontWeight: 600, 
                  fontFamily: 'system-ui, sans-serif',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}
              >
                AI Analysis (Advisory)
              </span>
            </div>

            {/* Content */}
            <div className="flex items-start gap-2 mb-2">
              <div style={{ color: styles.color }}>
                {getIcon()}
              </div>
              <div className="flex-1">
                <div 
                  className="mb-1"
                  style={{ 
                    fontSize: '12px', 
                    fontWeight: 600, 
                    fontFamily: 'system-ui, sans-serif',
                    color: '#111827'
                  }}
                >
                  {title}
                </div>
                <div 
                  style={{ 
                    fontSize: '11px', 
                    lineHeight: '1.5', 
                    fontFamily: 'system-ui, sans-serif',
                    fontWeight: 400,
                    color: '#6B7280'
                  }}
                >
                  {description}
                </div>
              </div>
            </div>

            {/* Related Section Link */}
            {relatedSection && onNavigateToSection && (
              <button
                onClick={onNavigateToSection}
                className="flex items-center gap-1 text-[#2563EB] hover:text-[#1D4ED8] transition-colors mt-2"
                style={{ 
                  fontSize: '11px', 
                  fontWeight: 500, 
                  fontFamily: 'system-ui, sans-serif'
                }}
              >
                <ExternalLink className="w-3 h-3" />
                View {relatedSection}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
