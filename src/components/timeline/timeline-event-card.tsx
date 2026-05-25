'use client';

import type { TimelineEntry, TimelinePrediction, PredictionStatus, TrendAnalysisResult } from "@/lib/ipc/channels";

// ---------------------------------------------------------------------------
// Prediction status badge
// ---------------------------------------------------------------------------

const STATUS_STYLES: Record<PredictionStatus, { bg: string; text: string; label: string }> = {
  pending: { bg: "var(--accent-bg)", text: "var(--accent)", label: "Pending" },
  confirmed: { bg: "#dcfce7", text: "#16a34a", label: "Confirmed" },
  refuted: { bg: "#fee2e2", text: "#dc2626", label: "Refuted" },
  expired: { bg: "#f3f4f6", text: "#6b7280", label: "Expired" },
};

export function PredictionStatusBadge({ status }: { status: PredictionStatus }) {
  const style = STATUS_STYLES[status];
  return (
    <span
      className="timeline-pred-badge"
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {style.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Confidence bar
// ---------------------------------------------------------------------------

export function ConfidenceBar({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  return (
    <div className="timeline-confidence">
      <div className="timeline-confidence__bar">
        <div
          className="timeline-confidence__fill"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="timeline-confidence__label">{pct}%</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Timeline event card
// ---------------------------------------------------------------------------

const TYPE_ICONS: Record<string, string> = {
  event: "📅",
  prediction: "🔮",
  milestone: "🏆",
};

const IMPORTANCE_COLORS: Record<string, string> = {
  high: "var(--accent)",
  medium: "var(--text-secondary)",
  low: "var(--text-tertiary, #9ca3af)",
};

export function TimelineEventCard({
  entry,
  onClick,
}: {
  entry: TimelineEntry;
  onClick?: () => void;
}) {
  const isPrediction = entry.type === "prediction";
  const meta = entry.metadata as Record<string, unknown> | undefined;
  const status = meta?.status as PredictionStatus | undefined;
  const conf = meta?.confidence as number | undefined;

  return (
    <div
      className={`timeline-event-card ${isPrediction ? "timeline-event-card--prediction" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="timeline-event-card__line" style={{ backgroundColor: IMPORTANCE_COLORS[entry.importance] }} />

      <div className="timeline-event-card__dot" style={{ backgroundColor: IMPORTANCE_COLORS[entry.importance] }} />

      <div className="timeline-event-card__body">
        <div className="timeline-event-card__header">
          <span className="timeline-event-card__icon">{TYPE_ICONS[entry.type] ?? "📌"}</span>
          <span className="timeline-event-card__title">{entry.title}</span>
          {status && <PredictionStatusBadge status={status} />}
          {conf !== undefined && <ConfidenceBar confidence={conf} />}
        </div>

        {entry.description && (
          <p className="timeline-event-card__desc">{entry.description}</p>
        )}

        <div className="timeline-event-card__meta">
          <time className="timeline-event-card__date">
            {new Date(entry.date).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
          </time>
          <span className="timeline-event-card__type-badge">{entry.type}</span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Prediction card (for the predictions tab)
// ---------------------------------------------------------------------------

export function PredictionCard({
  prediction,
  onVerify,
  onDelete,
}: {
  prediction: TimelinePrediction;
  onVerify?: (id: string, status: "confirmed" | "refuted" | "expired", actualOutcome?: string) => void;
  onDelete?: (id: string) => void;
}) {
  return (
    <div className="timeline-pred-card">
      <div className="timeline-pred-card__header">
        <PredictionStatusBadge status={prediction.status} />
        <ConfidenceBar confidence={prediction.confidence} />
      </div>

      <p className="timeline-pred-card__content">{prediction.content}</p>

      {prediction.reasoning && (
        <p className="timeline-pred-card__reasoning">{prediction.reasoning}</p>
      )}

      <div className="timeline-pred-card__footer">
        <time className="timeline-pred-card__date">
          Target: {prediction.predictedDate
            ? new Date(prediction.predictedDate).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
            : "No date"}
        </time>
        {prediction.verifiedAt && (
          <span className="timeline-pred-card__verified">
            Verified: {new Date(prediction.verifiedAt).toLocaleDateString()}
          </span>
        )}
        {prediction.actualOutcome && (
          <span className="timeline-pred-card__outcome">Outcome: {prediction.actualOutcome}</span>
        )}
      </div>

      {prediction.status === "pending" && onVerify && (
        <div className="timeline-pred-card__actions">
          <button className="timeline-pred-card__btn timeline-pred-card__btn--confirm" onClick={() => onVerify(prediction.id, "confirmed")}>
            Confirm
          </button>
          <button className="timeline-pred-card__btn timeline-pred-card__btn--refute" onClick={() => onVerify(prediction.id, "refuted")}>
            Refute
          </button>
          {onDelete && (
            <button className="timeline-pred-card__btn timeline-pred-card__btn--delete" onClick={() => onDelete(prediction.id)}>
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Accuracy dashboard card
// ---------------------------------------------------------------------------

export function AccuracyCard({ accuracy }: { accuracy: { total: number; confirmed: number; missed: number; pending: number; confirmedRate: number; missedRate: number; avgConfirmedConfidence: number; avgMissedConfidence: number } | null }) {
  if (!accuracy || accuracy.total === 0) return null;

  return (
    <div className="timeline-accuracy">
      <h3 className="timeline-accuracy__title">Prediction Accuracy</h3>
      <div className="timeline-accuracy__grid">
        <div className="timeline-accuracy__stat">
          <span className="timeline-accuracy__value">{accuracy.total}</span>
          <span className="timeline-accuracy__label">Total</span>
        </div>
        <div className="timeline-accuracy__stat">
          <span className="timeline-accuracy__value" style={{ color: "#16a34a" }}>{accuracy.confirmed}</span>
          <span className="timeline-accuracy__label">Confirmed ({Math.round(accuracy.confirmedRate * 100)}%)</span>
        </div>
        <div className="timeline-accuracy__stat">
          <span className="timeline-accuracy__value" style={{ color: "#dc2626" }}>{accuracy.missed}</span>
          <span className="timeline-accuracy__label">Missed ({Math.round(accuracy.missedRate * 100)}%)</span>
        </div>
        <div className="timeline-accuracy__stat">
          <span className="timeline-accuracy__value">{accuracy.pending}</span>
          <span className="timeline-accuracy__label">Pending</span>
        </div>
      </div>
      {accuracy.confirmed > 0 && (
        <div className="timeline-accuracy__detail">
          Avg confidence (confirmed): {Math.round(accuracy.avgConfirmedConfidence * 100)}%
          {accuracy.missed > 0 && (
            <> | Avg confidence (missed): {Math.round(accuracy.avgMissedConfidence * 100)}%</>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Trend analysis result display
// ---------------------------------------------------------------------------

export function TrendAnalysisCard({ analysis }: { analysis: TrendAnalysisResult }) {
  return (
    <div className="timeline-trend-card">
      <div className="timeline-trend-card__header">
        <h3 className="timeline-trend-card__title">Trend Analysis</h3>
        <span className="timeline-trend-card__period">{analysis.period}</span>
      </div>

      <div className="timeline-trend-card__report">{analysis.report}</div>

      {analysis.emergingTopics.length > 0 && (
        <div className="timeline-trend-card__section">
          <h4 className="timeline-trend-card__section-title">Emerging Topics</h4>
          <ul className="timeline-trend-card__list">
            {analysis.emergingTopics.map((t, i) => (
              <li key={i} className="timeline-trend-card__list-item timeline-trend-card__list-item--emerging">{t}</li>
            ))}
          </ul>
        </div>
      )}

      {analysis.decliningTopics.length > 0 && (
        <div className="timeline-trend-card__section">
          <h4 className="timeline-trend-card__section-title">Declining Topics</h4>
          <ul className="timeline-trend-card__list">
            {analysis.decliningTopics.map((t, i) => (
              <li key={i} className="timeline-trend-card__list-item timeline-trend-card__list-item--declining">{t}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="timeline-trend-card__meta">
        <span>Velocity: {analysis.knowledgeVelocity} nodes/wk</span>
        {analysis.costUsd > 0 && <span>Cost: ${analysis.costUsd.toFixed(4)}</span>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create prediction form
// ---------------------------------------------------------------------------

export function CreatePredictionForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (params: { content: string; confidence: number; predictedDate?: string; reasoning?: string }) => void;
  onCancel: () => void;
}) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    onSubmit({
      content: form.get("content") as string,
      confidence: parseInt(form.get("confidence") as string, 10) / 100,
      predictedDate: (form.get("predictedDate") as string) || undefined,
      reasoning: (form.get("reasoning") as string) || undefined,
    });
  };

  return (
    <form className="timeline-create-form" onSubmit={handleSubmit}>
      <textarea name="content" placeholder="Prediction statement..." required rows={2} className="timeline-create-form__input" />
      <div className="timeline-create-form__row">
        <label className="timeline-create-form__field">
          Confidence (%)
          <input name="confidence" type="number" min="1" max="100" defaultValue="50" required className="timeline-create-form__input" />
        </label>
        <label className="timeline-create-form__field">
          Target date
          <input name="predictedDate" type="date" className="timeline-create-form__input" />
        </label>
      </div>
      <input name="reasoning" placeholder="Reasoning (optional)" className="timeline-create-form__input" />
      <div className="timeline-create-form__actions">
        <button type="submit" className="timeline-create-form__btn timeline-create-form__btn--submit">Create</button>
        <button type="button" className="timeline-create-form__btn timeline-create-form__btn--cancel" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
