'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSkillStore } from '@/stores/skill-store';
import type { SkillInfo, SkillMetrics } from '@/lib/ipc/channels';

function SkillCard({
  skill,
  onToggle,
  onShowMetrics,
}: {
  skill: SkillInfo;
  onToggle: (id: string, enabled: boolean) => void;
  onShowMetrics: (skill: SkillInfo) => void;
}) {
  const typeLabel = skill.skillType === 'builtin' ? 'Built-in' : skill.skillType === 'domain' ? 'Domain' : 'Custom';
  const typeBadge = skill.source === 'domain' ? 'skill-card__badge--domain' : 'skill-card__badge--builtin';

  return (
    <div className={`skill-card ${!skill.isEnabled ? 'skill-card--disabled' : ''}`}>
      <div className="skill-card__header">
        <div className="skill-card__title-row">
          <h3 className="skill-card__name">{skill.name}</h3>
          <span className={`skill-card__badge ${typeBadge}`}>{typeLabel}</span>
        </div>
        {skill.description && <p className="skill-card__desc">{skill.description}</p>}
      </div>

      <div className="skill-card__stats">
        <div className="skill-card__stat">
          <span className="skill-card__stat-value">{skill.executionCount}</span>
          <span className="skill-card__stat-label">Executions</span>
        </div>
        <div className="skill-card__stat">
          <span className="skill-card__stat-value">{Math.round(skill.successRate * 100)}%</span>
          <span className="skill-card__stat-label">Success</span>
        </div>
      </div>

      <div className="skill-card__actions">
        <button
          className="skill-card__toggle"
          onClick={() => onToggle(skill.id, !skill.isEnabled)}
          aria-label={skill.isEnabled ? 'Disable skill' : 'Enable skill'}
          aria-pressed={skill.isEnabled}
        >
          <span className={`skill-card__toggle-indicator ${skill.isEnabled ? 'skill-card__toggle-indicator--on' : ''}`} />
          {skill.isEnabled ? 'Enabled' : 'Disabled'}
        </button>
        <button
          className="skill-card__metrics-btn"
          onClick={() => onShowMetrics(skill)}
          aria-label={`View metrics for ${skill.name}`}
        >
          Metrics
        </button>
      </div>
    </div>
  );
}

function SkillMetricsPanel({
  skill,
  metrics,
  onClose,
  onRate,
}: {
  skill: SkillInfo;
  metrics: SkillMetrics | null;
  onClose: () => void;
  onRate: (skillId: string, rating: number) => void;
}) {
  if (!metrics) return null;

  return (
    <div className="skill-metrics-panel">
      <div className="skill-metrics-panel__header">
        <h3 className="skill-metrics-panel__title">{skill.name} Metrics</h3>
        <button className="skill-metrics-panel__close" onClick={onClose} aria-label="Close metrics">x</button>
      </div>

      <div className="skill-metrics-panel__grid">
        <div className="skill-metrics-panel__item">
          <span className="skill-metrics-panel__value">{metrics.invocationCount}</span>
          <span className="skill-metrics-panel__label">Total Invocations</span>
        </div>
        <div className="skill-metrics-panel__item">
          <span className="skill-metrics-panel__value">{Math.round(metrics.successRate * 100)}%</span>
          <span className="skill-metrics-panel__label">Success Rate</span>
        </div>
        <div className="skill-metrics-panel__item">
          <span className="skill-metrics-panel__value">{metrics.successCount}</span>
          <span className="skill-metrics-panel__label">Successful</span>
        </div>
        <div className="skill-metrics-panel__item">
          <span className="skill-metrics-panel__value">
            {metrics.avgUserRating ? `${metrics.avgUserRating}/5` : 'N/A'}
          </span>
          <span className="skill-metrics-panel__label">Avg Rating</span>
        </div>
        <div className="skill-metrics-panel__item">
          <span className="skill-metrics-panel__value">
            {metrics.avgExecutionTimeMs !== null ? `${metrics.avgExecutionTimeMs}ms` : 'N/A'}
          </span>
          <span className="skill-metrics-panel__label">Avg Execution Time</span>
        </div>
        <div className="skill-metrics-panel__item">
          <span className="skill-metrics-panel__value">
            {metrics.avgCostUsd !== null ? `$${metrics.avgCostUsd.toFixed(6)}` : 'N/A'}
          </span>
          <span className="skill-metrics-panel__label">Avg Cost</span>
        </div>
      </div>

      <div className="skill-metrics-panel__rating">
        <span className="skill-metrics-panel__rating-label">Rate this skill:</span>
        <div className="skill-metrics-panel__stars">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              className="skill-metrics-panel__star"
              onClick={() => onRate(skill.id, star)}
              aria-label={`Rate ${star} stars`}
            >
              {star <= Math.round(metrics.avgUserRating ?? 0) ? '★' : '☆'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SkillsSettingsPage() {
  const skills = useSkillStore((s) => s.skills);
  const loading = useSkillStore((s) => s.loading);
  const error = useSkillStore((s) => s.error);
  const fetchSkills = useSkillStore((s) => s.fetchSkills);
  const toggleSkill = useSkillStore((s) => s.toggleSkill);
  const getMetrics = useSkillStore((s) => s.getMetrics);
  const rateSkill = useSkillStore((s) => s.rateSkill);

  const [selectedSkill, setSelectedSkill] = useState<SkillInfo | null>(null);
  const [metricsData, setMetricsData] = useState<SkillMetrics | null>(null);
  const [filter, setFilter] = useState<'all' | 'builtin' | 'domain'>('all');

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  const handleToggle = useCallback(
    async (id: string, enabled: boolean) => {
      await toggleSkill(id, enabled);
    },
    [toggleSkill],
  );

  const handleShowMetrics = useCallback(
    async (skill: SkillInfo) => {
      setSelectedSkill(skill);
      const data = await getMetrics(skill.id);
      setMetricsData(data);
    },
    [getMetrics],
  );

  const handleRate = useCallback(
    async (skillId: string, rating: number) => {
      await rateSkill(skillId, rating);
      if (selectedSkill) {
        const data = await getMetrics(skillId);
        setMetricsData(data);
      }
    },
    [rateSkill, getMetrics, selectedSkill],
  );

  const filteredSkills = filter === 'all' ? skills : skills.filter((s) => s.skillType === filter);
  const builtinCount = skills.filter((s) => s.skillType === 'builtin').length;
  const domainCount = skills.filter((s) => s.skillType === 'domain').length;

  return (
    <div className="settings-page">
      <div className="settings-page__header">
        <h1 className="settings-page__title">Skills</h1>
        <p className="settings-page__subtitle">
          Manage built-in and domain-specific skills
        </p>
      </div>

      <section className="settings-page__section">
        <div className="skill-filters">
          <button
            className={`skill-filter ${filter === 'all' ? 'skill-filter--active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({skills.length})
          </button>
          <button
            className={`skill-filter ${filter === 'builtin' ? 'skill-filter--active' : ''}`}
            onClick={() => setFilter('builtin')}
          >
            Built-in ({builtinCount})
          </button>
          <button
            className={`skill-filter ${filter === 'domain' ? 'skill-filter--active' : ''}`}
            onClick={() => setFilter('domain')}
          >
            Domain ({domainCount})
          </button>
        </div>

        {loading && <div className="skill-loading">Loading skills...</div>}
        {error && <div className="skill-error">{error}</div>}

        {!loading && filteredSkills.length === 0 && (
          <div className="skill-empty">
            No skills found. Skills are discovered from built-in definitions and domain configurations.
          </div>
        )}

        <div className="skill-list">
          {filteredSkills.map((skill) => (
            <SkillCard
              key={skill.id}
              skill={skill}
              onToggle={handleToggle}
              onShowMetrics={handleShowMetrics}
            />
          ))}
        </div>
      </section>

      {selectedSkill && (
        <SkillMetricsPanel
          skill={selectedSkill}
          metrics={metricsData}
          onClose={() => {
            setSelectedSkill(null);
            setMetricsData(null);
          }}
          onRate={handleRate}
        />
      )}
    </div>
  );
}
