'use client';

import type { KnowledgeNode, KnowledgeEdge } from '@/lib/ipc/channels';
import { ComprehensionIndicator } from './comprehension-indicator';

interface KnowledgeDetailProps {
  node: KnowledgeNode;
  edges?: KnowledgeEdge[];
  onEdit?: () => void;
  onDelete?: () => void;
  onNodeClick?: (nodeId: string) => void;
}

const TYPE_LABELS: Record<string, string> = {
  concept: 'Concept',
  technology: 'Technology',
  person: 'Person',
  event: 'Event',
  decision: 'Decision',
  resource: 'Resource',
  question: 'Question',
};

export function KnowledgeDetail({ node, edges, onEdit, onDelete, onNodeClick }: KnowledgeDetailProps) {
  const connectedNodes = (edges ?? [])
    .filter((e) => e.sourceId === node.id || e.targetId === node.id)
    .map((e) => ({
      id: e.sourceId === node.id ? e.targetId : e.sourceId,
      type: e.type,
      weight: e.weight,
    }));

  return (
    <div className="knowledge-detail">
      <div className="knowledge-detail__header">
        <div className="knowledge-detail__type-row">
          <span className="knowledge-detail__type-badge">{TYPE_LABELS[node.type] ?? node.type}</span>
          <ComprehensionIndicator level={node.comprehensionLevel} size="md" />
        </div>
        <h2 className="knowledge-detail__title">{node.title}</h2>
        <div className="knowledge-detail__actions">
          {onEdit && (
            <button className="knowledge-detail__action-btn" onClick={onEdit} aria-label="Edit node">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5z" />
              </svg>
              Edit
            </button>
          )}
          {onDelete && (
            <button className="knowledge-detail__action-btn knowledge-detail__action-btn--danger" onClick={onDelete} aria-label="Delete node">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z" />
                <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H5.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1h2.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z" />
              </svg>
              Delete
            </button>
          )}
        </div>
      </div>

      <div className="knowledge-detail__content">
        {node.content ? (
          <div className="knowledge-detail__markdown">{node.content}</div>
        ) : (
          <p className="knowledge-detail__empty-content">No content yet.</p>
        )}
      </div>

      {connectedNodes.length > 0 && (
        <div className="knowledge-detail__connections">
          <h3 className="knowledge-detail__section-title">Related Nodes</h3>
          <ul className="knowledge-detail__connection-list">
            {connectedNodes.map((cn) => (
              <li key={cn.id}>
                <button
                  className="knowledge-detail__connection-item"
                  onClick={() => onNodeClick?.(cn.id)}
                >
                  <span className="knowledge-detail__connection-type">{cn.type}</span>
                  <span className="knowledge-detail__connection-id">{cn.id.slice(0, 8)}...</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {node.sources.length > 0 && (
        <div className="knowledge-detail__sources">
          <h3 className="knowledge-detail__section-title">Sources</h3>
          <ul className="knowledge-detail__source-list">
            {node.sources.map((src) => (
              <li key={src} className="knowledge-detail__source-item">{src}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="knowledge-detail__footer">
        <span className="knowledge-detail__timestamp">Created {new Date(node.createdAt).toLocaleDateString()}</span>
        <span className="knowledge-detail__timestamp">Updated {new Date(node.updatedAt).toLocaleDateString()}</span>
      </div>
    </div>
  );
}
