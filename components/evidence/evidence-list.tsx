import type { EvidenceItem } from "@/lib/domain/schemas";
import { StatusBadge } from "@/components/ui/status-badge";

type EvidenceListProps = {
  evidence: EvidenceItem[];
};

export function EvidenceList({ evidence }: EvidenceListProps) {
  if (evidence.length === 0) {
    return (
      <div className="empty-record">
        <p>No source-backed evidence has been recorded for this case yet.</p>
      </div>
    );
  }

  return (
    <div className="evidence-list">
      {evidence.map((item) => (
        <article className="evidence-record" key={item.id}>
          <div className="evidence-record__heading">
            <div>
              <p className="evidence-record__source">{item.sourceName}</p>
              <h3>{item.summary}</h3>
            </div>
            <StatusBadge label={`${item.confidence} confidence`} tone={item.confidence === "high" ? "field" : item.confidence === "medium" ? "amber" : "alert"} />
          </div>
          <div className="evidence-record__meta">
            <span><i className="legend-dot legend-dot--field" />{item.sourceType}</span>
            <span><i className="legend-dot legend-dot--amber" />{item.freshness}</span>
            <span className="mono-text">{new Date(item.retrievedAt).toLocaleString()}</span>
          </div>
          {typeof item.metadata?.resourceCount === "number" ? <p className="evidence-record__note">{item.metadata.resourceCount} mapped location{item.metadata.resourceCount === 1 ? "" : "s"} found · availability not verified</p> : null}
          <div className="evidence-record__footer">
            {item.sourceUrl ? <a href={item.sourceUrl} target="_blank" rel="noreferrer">Open source <span aria-hidden="true">↗</span></a> : <span>Source URL unavailable</span>}
            <span className="mono-text">sha256:{item.contentHash.slice(0, 12)}…</span>
          </div>
        </article>
      ))}
    </div>
  );
}
