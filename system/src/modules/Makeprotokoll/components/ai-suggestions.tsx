import React, { useState } from 'react';
import { Lightbulb, X, ThumbsUp, ThumbsDown, ChevronDown } from 'lucide-react';

interface AISuggestion {
  id: string;
  type: 'missing-element' | 'consistency' | 'regulatory' | 'clarification';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  suggestedText?: string;
  location: string;
  rationale: string;
  reference?: string;
}

interface AISuggestionsProps {
  suggestions: AISuggestion[];
  onAccept?: (id: string) => void;
  onDismiss?: (id: string) => void;
}

export function AISuggestions({ suggestions, onAccept, onDismiss }: AISuggestionsProps) {
  const [expandedSuggestions, setExpandedSuggestions] = useState<Set<string>>(new Set());
  const [panelExpanded, setPanelExpanded] = useState(true);

  if (suggestions.length === 0) {
    return null;
  }

  const toggleSuggestion = (id: string) => {
    const newExpanded = new Set(expandedSuggestions);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedSuggestions(newExpanded);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-red-300 bg-red-50';
      case 'medium':
        return 'border-amber-300 bg-amber-50';
      case 'low':
        return 'border-blue-300 bg-blue-50';
      default:
        return 'border-slate-300 bg-slate-50';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'missing-element':
        return 'Missing Element';
      case 'consistency':
        return 'Consistency';
      case 'regulatory':
        return 'Regulatory';
      case 'clarification':
        return 'Clarification';
      default:
        return 'Suggestion';
    }
  };

  return (
    <div className="border border-blue-300 rounded overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50">
      <button
        onClick={() => setPanelExpanded(!panelExpanded)}
        className="w-full p-3 text-left hover:bg-blue-100/50 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">
              AI Suggestions ({suggestions.length})
            </span>
          </div>
          <ChevronDown 
            className={`w-4 h-4 text-blue-600 transition-transform ${panelExpanded ? '' : '-rotate-90'}`}
          />
        </div>
      </button>

      {panelExpanded && (
        <div className="p-3 space-y-2">
          <div className="text-xs text-blue-800 mb-3">
            AI has identified opportunities to improve this section. Review each suggestion and accept, modify, or dismiss.
          </div>

          {suggestions.map((suggestion) => {
            const isExpanded = expandedSuggestions.has(suggestion.id);
            
            return (
              <div 
                key={suggestion.id}
                className={`border rounded overflow-hidden ${getPriorityColor(suggestion.priority)}`}
              >
                <button
                  onClick={() => toggleSuggestion(suggestion.id)}
                  className="w-full p-3 text-left hover:brightness-95 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-slate-900">
                          {suggestion.title}
                        </span>
                        <span className="px-1.5 py-0.5 bg-white/60 text-slate-700 text-xs rounded">
                          {getTypeLabel(suggestion.type)}
                        </span>
                        {suggestion.priority === 'high' && (
                          <span className="px-1.5 py-0.5 bg-red-200 text-red-800 text-xs rounded font-medium">
                            High Priority
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-600">
                        {suggestion.location}
                      </div>
                    </div>
                    <ChevronDown 
                      className={`w-4 h-4 text-slate-600 transition-transform ${isExpanded ? '' : '-rotate-90'}`}
                    />
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-3 pb-3 space-y-3">
                    <div className="p-3 bg-white/80 border border-slate-200 rounded">
                      <div className="text-xs font-medium text-slate-900 mb-1">Description</div>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        {suggestion.description}
                      </p>
                    </div>

                    {suggestion.suggestedText && (
                      <div className="p-3 bg-white/80 border border-slate-200 rounded">
                        <div className="text-xs font-medium text-slate-900 mb-1">Suggested Text</div>
                        <div className="text-xs text-slate-700 leading-relaxed font-mono bg-slate-50 p-2 rounded border border-slate-200">
                          {suggestion.suggestedText}
                        </div>
                        <div className="text-xs text-slate-500 mt-2 italic">
                          You may copy, modify, or adapt this text as needed
                        </div>
                      </div>
                    )}

                    <div className="p-3 bg-white/80 border border-slate-200 rounded">
                      <div className="text-xs font-medium text-slate-900 mb-1">AI Rationale</div>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        {suggestion.rationale}
                      </p>
                      {suggestion.reference && (
                        <div className="text-xs text-slate-600 mt-2 italic">
                          Reference: {suggestion.reference}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {onAccept && (
                        <button
                          onClick={() => onAccept(suggestion.id)}
                          className="flex-1 px-3 py-2 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors flex items-center justify-center gap-1"
                        >
                          <ThumbsUp className="w-3 h-3" />
                          Accept & Apply
                        </button>
                      )}
                      {onDismiss && (
                        <button
                          onClick={() => onDismiss(suggestion.id)}
                          className="flex-1 px-3 py-2 border border-slate-300 text-slate-700 text-xs rounded hover:bg-white/50 transition-colors flex items-center justify-center gap-1"
                        >
                          <ThumbsDown className="w-3 h-3" />
                          Dismiss
                        </button>
                      )}
                    </div>

                    <div className="p-2 bg-amber-100 border border-amber-300 rounded">
                      <div className="text-xs text-amber-900">
                        <strong>Note:</strong> Accepting a suggestion logs it to your audit trail. You remain responsible for all content.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          <div className="p-3 bg-white/80 border border-blue-300 rounded mt-3">
            <div className="text-xs text-blue-900">
              <strong>How AI suggestions work:</strong> Suggestions are generated by analyzing your protocol content, 
              comparing it to approved upstream documents, and checking against regulatory requirements. 
              AI never auto-applies changes—all decisions are yours.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
