'use client';

import { useState, useCallback } from 'react';
import { useOnboardingStore } from '@/stores/onboarding-store';

type ApiSetupOption = 'api-key' | 'free-trial' | 'ollama' | null;

const PROVIDERS = [
  { id: 'anthropic', label: 'Anthropic', placeholder: 'sk-ant-...' },
  { id: 'openai', label: 'OpenAI', placeholder: 'sk-...' },
  { id: 'deepseek', label: 'DeepSeek', placeholder: 'sk-...' },
  { id: 'google', label: 'Google AI', placeholder: 'AI...' },
  { id: 'groq', label: 'Groq', placeholder: 'gsk_...' },
  { id: 'openrouter', label: 'OpenRouter', placeholder: 'sk-or-...' },
];

type ValidationState = 'idle' | 'validating' | 'success' | 'error';

export function ApiKeySetup() {
  const { nextStep, prevStep, setHasApiKey } = useOnboardingStore();
  const [selectedOption, setSelectedOption] = useState<ApiSetupOption>(null);
  const [provider, setProvider] = useState(PROVIDERS[0]);
  const [apiKey, setApiKey] = useState('');
  const [validation, setValidation] = useState<ValidationState>('idle');
  const [ollamaStatus, setOllamaStatus] = useState<'checking' | 'connected' | 'not-found'>('checking');
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);

  const handleTestConnection = useCallback(async () => {
    setValidation('validating');
    // Simulate validation — in production this calls IPC to test the key
    try {
      if (typeof window !== 'undefined' && window.api) {
        const result = await window.api.model.validateApiKey({
          providerId: provider.id,
          apiKey,
        });
        if (result.valid) {
          setValidation('success');
          setHasApiKey(true);
        } else {
          setValidation('error');
        }
      } else {
        // Dev mode: accept any non-empty key
        await new Promise((r) => setTimeout(r, 1000));
        if (apiKey.trim().length > 0) {
          setValidation('success');
          setHasApiKey(true);
        } else {
          setValidation('error');
        }
      }
    } catch {
      setValidation('error');
    }
  }, [provider.id, apiKey, setHasApiKey]);

  const handleSelectOllama = useCallback(() => {
    setSelectedOption('ollama');
    // Check if Ollama is running
    (async () => {
      try {
        const res = await fetch('http://localhost:11434/api/tags');
        const data = await res.json();
        setOllamaModels((data.models ?? []).map((m: { name: string }) => m.name));
        setOllamaStatus('connected');
        setHasApiKey(true);
      } catch {
        setOllamaStatus('not-found');
        setOllamaModels([]);
      }
    })();
  }, [setHasApiKey]);

  const handleContinue = useCallback(() => {
    nextStep();
  }, [nextStep]);

  // If an option is selected, show the expanded sub-view
  if (selectedOption === 'api-key') {
    return (
      <div className="onboarding__content">
        <h2 className="onboarding__step-title">Configure API Key</h2>
        <p className="onboarding__step-desc">Enter your own key from any supported provider.</p>

        <label className="onboarding__label">
          Provider
          <select
            className="onboarding__select"
            value={provider.id}
            onChange={(e) => {
              const p = PROVIDERS.find((x) => x.id === e.target.value);
              if (p) setProvider(p);
              setValidation('idle');
            }}
          >
            {PROVIDERS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>

        <label className="onboarding__label">
          API Key
          <input
            className="onboarding__input"
            type="password"
            placeholder={provider.placeholder}
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value);
              setValidation('idle');
            }}
          />
        </label>

        <button
          className="onboarding__btn-secondary"
          onClick={handleTestConnection}
          disabled={apiKey.trim().length === 0 || validation === 'validating'}
        >
          {validation === 'validating' ? 'Testing...' : 'Test Connection'}
        </button>

        {validation === 'success' && (
          <div className="onboarding__success">Connected successfully</div>
        )}
        {validation === 'error' && (
          <div className="onboarding__error">Connection failed. Please check your key.</div>
        )}

        <div className="onboarding__nav">
          <button className="onboarding__btn-ghost" onClick={() => setSelectedOption(null)}>
            Back
          </button>
          <button
            className="onboarding__btn-primary"
            onClick={handleContinue}
            disabled={validation !== 'success'}
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  if (selectedOption === 'free-trial') {
    return (
      <div className="onboarding__content">
        <h2 className="onboarding__step-title">Free Trial</h2>
        <p className="onboarding__step-desc">
          Connect to the shared proxy with limited daily credits.
        </p>

        <div className="onboarding__trial-info">
          <span className="onboarding__trial-badge">50 messages/day</span>
          <p>Use AgentClaw with a shared proxy — no API key needed.</p>
        </div>

        <div className="onboarding__nav">
          <button className="onboarding__btn-ghost" onClick={() => setSelectedOption(null)}>
            Back
          </button>
          <button
            className="onboarding__btn-primary"
            onClick={() => {
              setHasApiKey(true);
              handleContinue();
            }}
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  if (selectedOption === 'ollama') {
    return (
      <div className="onboarding__content">
        <h2 className="onboarding__step-title">Local Model (Ollama)</h2>
        <p className="onboarding__step-desc">Run models locally — no API key needed.</p>

        <div className="onboarding__ollama-status">
          {ollamaStatus === 'checking' && <span>Detecting Ollama...</span>}
          {ollamaStatus === 'connected' && (
            <>
              <div className="onboarding__success">
                Ollama detected on localhost:11434
              </div>
              {ollamaModels.length > 0 ? (
                <div className="onboarding__ollama-models">
                  <p className="onboarding__label">Available Models:</p>
                  <ul>
                    {ollamaModels.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="onboarding__hint">No models installed. Pull one with: ollama pull llama3</p>
              )}
            </>
          )}
          {ollamaStatus === 'not-found' && (
            <div className="onboarding__error">
              Ollama not detected. Install it from{' '}
              <a href="https://ollama.com" target="_blank" rel="noreferrer">
                ollama.com
              </a>{' '}
              and start it, then try again.
            </div>
          )}
        </div>

        <div className="onboarding__nav">
          <button className="onboarding__btn-ghost" onClick={() => setSelectedOption(null)}>
            Back
          </button>
          <button
            className="onboarding__btn-primary"
            onClick={handleContinue}
            disabled={ollamaStatus !== 'connected'}
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  // Default: show 3 option cards
  return (
    <div className="onboarding__content">
      <h2 className="onboarding__step-title">Connect Your AI Model</h2>
      <p className="onboarding__step-desc">
        Choose how to power your research assistant.
      </p>

      <div className="onboarding__options">
        <button className="onboarding__option-card" onClick={() => setSelectedOption('api-key')}>
          <span className="onboarding__option-icon">🔑</span>
          <span className="onboarding__option-title">Configure API Key</span>
          <span className="onboarding__option-desc">Enter your own key from any provider</span>
        </button>

        <button className="onboarding__option-card" onClick={() => setSelectedOption('free-trial')}>
          <span className="onboarding__option-icon">🆓</span>
          <span className="onboarding__option-title">Free Trial</span>
          <span className="onboarding__option-desc">50 messages/day via shared proxy</span>
        </button>

        <button className="onboarding__option-card" onClick={handleSelectOllama}>
          <span className="onboarding__option-icon">🤖</span>
          <span className="onboarding__option-title">Local (Ollama)</span>
          <span className="onboarding__option-desc">Run models locally, no key needed</span>
        </button>
      </div>

      <div className="onboarding__nav">
        <button className="onboarding__btn-ghost" onClick={prevStep}>
          Back
        </button>
        <button className="onboarding__btn-ghost" onClick={nextStep}>
          Skip →
        </button>
      </div>
    </div>
  );
}
