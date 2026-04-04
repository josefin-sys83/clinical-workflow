import React, { useState, useRef, useEffect } from 'react';
import { User } from 'lucide-react';

interface Person {
  name: string;
  email: string;
}

interface PersonSuggestion extends Person {
  department?: string;
  lastUsed?: string;
  projectCount?: number;
}

interface PersonAutocompleteProps {
  value: Person;
  onChange: (person: Person) => void;
  suggestions: PersonSuggestion[];
  placeholder?: string;
  field: 'name' | 'email';
}

export function PersonAutocomplete({ 
  value, 
  onChange, 
  suggestions, 
  placeholder,
  field 
}: PersonAutocompleteProps) {
  const [inputValue, setInputValue] = useState(field === 'name' ? value.name : value.email);
  const [showDropdown, setShowDropdown] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter suggestions based on input
  const filteredSuggestions = suggestions.filter(s => {
    const searchValue = inputValue.toLowerCase();
    if (field === 'name') {
      return s.name.toLowerCase().includes(searchValue);
    } else {
      return s.email.toLowerCase().includes(searchValue);
    }
  });

  useEffect(() => {
    setInputValue(field === 'name' ? value.name : value.email);
  }, [value, field]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (newValue: string) => {
    setInputValue(newValue);
    setShowDropdown(newValue.length >= 2);
    setFocusedIndex(-1);

    // Update the person object
    if (field === 'name') {
      onChange({ ...value, name: newValue });
      
      // Check if name matches any suggestion exactly - auto-populate email
      const match = suggestions.find(s => s.name.toLowerCase() === newValue.toLowerCase());
      if (match) {
        onChange({ name: match.name, email: match.email });
      }
    } else {
      onChange({ ...value, email: newValue });
      
      // Check if email matches any suggestion - auto-populate name
      const match = suggestions.find(s => s.email.toLowerCase() === newValue.toLowerCase());
      if (match) {
        onChange({ name: match.name, email: match.email });
      }
    }
  };

  const handleSelectSuggestion = (suggestion: PersonSuggestion) => {
    onChange({ name: suggestion.name, email: suggestion.email });
    setInputValue(field === 'name' ? suggestion.name : suggestion.email);
    setShowDropdown(false);
    setFocusedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || filteredSuggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => 
          prev < filteredSuggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < filteredSuggestions.length) {
          handleSelectSuggestion(filteredSuggestions[focusedIndex]);
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        setFocusedIndex(-1);
        break;
    }
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type={field === 'email' ? 'email' : 'text'}
        value={inputValue}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => {
          if (inputValue.length >= 2) {
            setShowDropdown(true);
          }
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {showDropdown && filteredSuggestions.length > 0 && (
        <div 
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-64 overflow-y-auto"
        >
          {filteredSuggestions.map((suggestion, index) => (
            <div
              key={`${suggestion.email}-${index}`}
              onClick={() => handleSelectSuggestion(suggestion)}
              onMouseEnter={() => setFocusedIndex(index)}
              className={`px-3 py-2.5 cursor-pointer border-b border-slate-100 last:border-b-0 transition-colors ${
                focusedIndex === index ? 'bg-blue-50' : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-900 truncate">
                    {suggestion.name}
                  </div>
                  <div className="text-xs text-slate-600 truncate">
                    {suggestion.email}
                  </div>
                  {suggestion.department && (
                    <div className="text-xs text-slate-500 mt-0.5">
                      {suggestion.department}
                    </div>
                  )}
                </div>
                {suggestion.projectCount && suggestion.projectCount > 1 && (
                  <div className="flex-shrink-0">
                    <span className="inline-block px-2 py-0.5 text-xs font-medium text-green-700 bg-green-50 rounded">
                      Used {suggestion.projectCount}x
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
