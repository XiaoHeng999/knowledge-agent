'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { ParameterState } from './types';

interface ParameterInputProps {
  paramState: ParameterState;
  onSubmit: (params: Record<string, string>) => void;
  onBack: () => void;
}

export function ParameterInput({ paramState, onSubmit, onBack }: ParameterInputProps) {
  const current = paramState.params[paramState.currentStep];
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [selectedSuggestionIdx, setSelectedSuggestionIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue('');
    setError(null);
    setSelectedSuggestionIdx(-1);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [paramState.currentStep]);

  const validate = useCallback(
    (v: string): boolean => {
      if (current.required && v.trim().length === 0) return false;
      if (current.validationPattern && !current.validationPattern.test(v)) {
        setError(current.validationMessage || 'Invalid input');
        return false;
      }
      setError(null);
      return true;
    },
    [current],
  );

  const handleChange = useCallback(
    (v: string) => {
      setValue(v);
      if (v.length > 0) validate(v);
      else setError(null);

      if (current.suggestions) {
        const filtered = current.suggestions.filter((s) =>
          s.toLowerCase().includes(v.toLowerCase()),
        );
        setFilteredSuggestions(filtered);
        setSelectedSuggestionIdx(-1);
      }
    },
    [current, validate],
  );

  const handleSubmit = useCallback(() => {
    if (!validate(value)) return;

    const collected: Record<string, string> = {};
    for (let i = 0; i < paramState.currentStep; i++) {
      collected[paramState.params[i].name] = '';
    }
    collected[current.name] = value.trim();

    const isLastStep = paramState.currentStep === paramState.params.length - 1;
    if (isLastStep) {
      onSubmit(collected);
    } else {
      // Parent will handle advancing to next step via onBack -> re-enter
      onSubmit(collected);
    }
  }, [value, current, paramState, onSubmit, validate]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (paramState.currentStep === 0) {
          onBack();
        } else {
          onBack();
        }
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredSuggestions.length > 0 && selectedSuggestionIdx >= 0) {
          setValue(filteredSuggestions[selectedSuggestionIdx]);
          setFilteredSuggestions([]);
          setSelectedSuggestionIdx(-1);
        } else {
          handleSubmit();
        }
        return;
      }
      if (e.key === 'Tab') {
        if (filteredSuggestions.length > 0 && selectedSuggestionIdx >= 0) {
          e.preventDefault();
          setValue(filteredSuggestions[selectedSuggestionIdx]);
          setFilteredSuggestions([]);
          setSelectedSuggestionIdx(-1);
        }
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSuggestionIdx((prev) =>
          prev < filteredSuggestions.length - 1 ? prev + 1 : 0,
        );
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSuggestionIdx((prev) =>
          prev > 0 ? prev - 1 : filteredSuggestions.length - 1,
        );
        return;
      }
      if (e.key === 'Backspace' && value.length === 0) {
        onBack();
      }
    },
    [filteredSuggestions, selectedSuggestionIdx, handleSubmit, onBack, value],
  );

  const isMulti = paramState.params.length > 1;
  const stepLabel = isMulti ? `(${paramState.currentStep + 1} of ${paramState.params.length})` : '';

  return (
    <div className="cmd-palette__param">
      <div className="cmd-palette__param-header">
        <span className="cmd-palette__param-cmd">/ {paramState.commandLabel}</span>
        {stepLabel && <span className="cmd-palette__param-step">{stepLabel}</span>}
      </div>
      <input
        ref={inputRef}
        className={`cmd-palette__param-input ${error ? 'cmd-palette__param-input--error' : ''}`}
        type="text"
        placeholder={current.placeholder}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        aria-label={current.name}
      />
      {error && (
        <p className="cmd-palette__param-error" role="alert">
          {error}
        </p>
      )}
      {current.hint && !error && (
        <p className="cmd-palette__param-hint">{current.hint}</p>
      )}
      {filteredSuggestions.length > 0 && (
        <ul className="cmd-palette__param-suggestions" role="listbox">
          {filteredSuggestions.map((s, i) => (
            <li
              key={s}
              role="option"
              aria-selected={i === selectedSuggestionIdx}
              className={`cmd-palette__param-suggestion ${i === selectedSuggestionIdx ? 'cmd-palette__param-suggestion--selected' : ''}`}
              onClick={() => {
                setValue(s);
                setFilteredSuggestions([]);
                inputRef.current?.focus();
              }}
              onMouseEnter={() => setSelectedSuggestionIdx(i)}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
      <div className="cmd-palette__footer-hint">
        <span>Esc back</span>
        <span>&#9166; execute</span>
      </div>
    </div>
  );
}
