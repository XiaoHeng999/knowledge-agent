'use client';

import { useState, useCallback } from 'react';

type BlockerOption = 'api-key' | 'free-trial' | 'ollama' | null;

const PROVIDERS = [
  { id: 'anthropic', label: 'Anthropic', placeholder: 'sk-ant-...' },
  { id: 'openai', label: 'OpenAI', placeholder: 'sk-...' },
  { id: 'deepseek', label: 'DeepSeek', placeholder: 'sk-...' },
  { id: 'google', label: 'Google AI', placeholder: 'AI...' },
  { id: 'groq', label: 'Groq', placeholder: 'gsk_...' },
  { id: 'openrouter', label: 'OpenRouter', placeholder: 'sk-or-...' },
];

interface NoApiKeyBlockerProps {
  /** Called when API key is successfully connected */
  onConnected: () => void;
  /** Called when user chooses to browse in limited mode */
  onBrowseLimited?: () => void;
}

export function NoApiKeyBlocker({ onConnected, onBrowseLimited }: NoApiKeyBlockerProps) {
  const [selectedOption, setSelectedOption] = useState<BlockerOption>(null);
  const [provider, setProvider] = useState(PROVIDERS[0]);
  const [apiKey, setApiKey] = useState('');
  const [validation, setValidation] = useState<'idle' | 'validating' | 'success' | 'error'>('idle');

  const handleTestConnection = useCallback(async () => {
    setValidation('validating');
    try {
      if (typeof window !== 'undefined' && window.api) {
        const result = await window.api.model.validateApiKey({
          providerId: provider.id,
          apiKey,
        });
        if (result.valid) {
          setValidation('success');
          onConnected();
        } else {
          setValidation('error');
        }
      } else {
        await new Promise((r) => setTimeout(r, 1000));
        if (apiKey.trim().length > 0) {
          setValidation('success');
          onConnected();
        } else {
          setValidation('error');
        }
      }
    } catch {
      setValidation('error');
    }
  }, [provider.id, apiKey, onConnected]);

  // API key sub-view
  if (selectedOption === 'api-key') {
    return (
      <div className="no-api-key__inner">
        <h2 className="no-api-key__title">Configure API Key</h2>

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
              <option key={p.id} value={p.id}>{p.label}</option>
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
            onChange={(e) => { setApiKey(e.target.value); setValidation('idle'); }}
          />
        </label>

        <button
          className="onboarding__btn-secondary"
          onClick={handleTestConnection}
          disabled={apiKey.trim().length === 0 || validation === 'validating'}
        >
          {validation === 'validating' ? 'Testing...' : 'Test Connection'}
        </button>

        {validation === 'success' && <div className="onboarding__success">Connected successfully</div>}
        {validation === 'error' && <div className="onboarding__error">Connection failed. Check your key.</div>}

        <button className="onboarding__btn-ghost" onClick={() => setSelectedOption(null)}>
          Back to options
        </button>
      </div>
    );
  }

  // Default: full-screen blocking card
  return (
    <div className="no-api-key">
      <div className="no-api-key__inner">
        <div className="no-api-key__icon">⚠️</div>
        <h2 className="no-api-key__title">AI features require an API key</h2>
        <p className="no-api-key__desc">
          To use expert chat, automated research, and other AI features, connect a model provider.
        </p>

        <div className="no-api-key__options">
          <button className="no-api-key__option" onClick={() => setSelectedOption('api-key')}>
            <span className="no-api-key__option-icon">🔑</span>
            <span className="no-api-key__option-title">Enter API Key</span>
            <span className="no-api-key__option-desc">Use your own key from any provider</span>
          </button>

          <button
            className="no-api-key__option"
            onClick={() => {
              // In production, connect to shared proxy
              onConnected();
            }}
          >
            <span className="no-api-key__option-icon">🆓</span>
            <span className="no-api-key__option-title">Free Trial</span>
            <span className="no-api-key__option-desc">50 messages/day via shared proxy</span>
          </button>

          <button
            className="no-api-key__option"
            onClick={() => {
              // In production, detect Ollama
              onConnected();
            }}
          >
            <span className="no-api-key__option-icon">🤖</span>
            <span className="no-api-key__option-title">Local (Ollama)</span>
            <span className="no-api-key__option-desc">Run models locally, no key needed</span>
          </button>
        </div>

        <p className="no-api-key__note">
          You can still browse and manage existing knowledge without an API key.
        </p>

        {onBrowseLimited && (
          <button className="onboarding__btn-ghost" onClick={onBrowseLimited}>
            Continue in limited mode
          </button>
        )}
      </div>
    </div>
  );
}
