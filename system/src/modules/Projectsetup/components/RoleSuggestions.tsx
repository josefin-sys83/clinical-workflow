import React from 'react';
import { Sparkles } from 'lucide-react';

interface Person {
  name: string;
  email: string;
}

interface SuggestedPerson extends Person {
  reason: string;
  projectName?: string;
}

interface RoleSuggestionsProps {
  suggestions: SuggestedPerson[];
  onSelect: (person: Person) => void;
  currentAssignment?: Person;
}

export function RoleSuggestions({ suggestions, onSelect, currentAssignment }: RoleSuggestionsProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-4 h-4 text-blue-600" />
        <span className="text-xs font-medium text-blue-900">Suggested based on previous projects</span>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion, idx) => {
          const isCurrentlyAssigned = 
            currentAssignment?.email === suggestion.email;
          
          return (
            <button
              key={idx}
              onClick={() => onSelect(suggestion)}
              disabled={isCurrentlyAssigned}
              className={`group relative flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-all ${
                isCurrentlyAssigned
                  ? 'bg-green-100 border-2 border-green-300 text-green-800 cursor-default'
                  : 'bg-white border border-blue-300 text-blue-900 hover:bg-blue-100 hover:border-blue-400'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-medium">{suggestion.name}</span>
                {suggestion.projectName && (
                  <span className="text-xs text-blue-600 opacity-70">
                    ({suggestion.projectName})
                  </span>
                )}
              </div>
              
              {/* Tooltip on hover */}
              {!isCurrentlyAssigned && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  <div className="bg-slate-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
                    {suggestion.reason}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-900 transform rotate-45"></div>
                  </div>
                </div>
              )}
              
              {isCurrentlyAssigned && (
                <span className="text-xs text-green-700 font-medium">✓ Assigned</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
