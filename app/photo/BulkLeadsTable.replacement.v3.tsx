import React, { useMemo, useState } from "react";

export type BulkLead = {
  id: string;
  selected: boolean;
  company: string;
  city: string;
  website: string;
  analysisStatus: "idle" | "loading" | "done" | "error";
  analysisStars: 0 | 1 | 2 | 3;
  analysisSummary: string;
  foundJobTitles: string[];
  contactStatus: "idle" | "loading" | "done" | "error";
  email: string;
  contactPerson: string;
  industry: string;
  qualityStatus: "idle" | "loading" | "done" | "error";
  qualityStars: 0 | 1 | 2 | 3;
  qualitySummary: string;
  alreadyContacted: boolean;
  lastContactAt: string;
  sendStatus: "idle" | "loading" | "sent" | "error";
};

type BulkSortKey = "company" | "analysis" | "contacts" | "quality" | "send";
type BulkSortDirection = "asc" | "desc";
type BatchState = { active: boolean; current: number; total: number };

type Props = {
  leads: BulkLead[];
  onToggleSelected: (id: string, selected: boolean) => void;
  onSetAllSelected: (selected: boolean) => void;
  onAnalyzeOne: (id: string) => Promise<void> | void;
  onCollectOne: (id: string) => Promise<void> | void;
  onQualityOne: (id: string) => Promise<void> | void;
  onSendOne: (id: string) => Promise<void> | void;
};

const tableHeadStyle: React.CSSProperties = {
  padding: "12px 14px",
  fontSize: "13px",
  fontWeight: 700,
  color: "#111827",
  borderBottom: "1px solid #e5e7eb",
  verticalAlign: "top",
};

const tableCellStyle: React.CSSProperties = {
  padding: "12px 14px",
  verticalAlign: "top",
  borderBottom: "1px solid #f3f4f6",
};

function smallButtonStyle(disabled = false): React.CSSProperties {
  return {
    padding: "8px 10px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#111827",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: "12px",
    opacity: disabled ? 0.65 : 1,
  };
}

function stars(value: 0 | 1 | 2 | 3) {
  if (value === 0) return "–";
  return "★".repeat(value);
}

function statusRank(status: "idle" | "loading" | "done" | "error") {
  switch (status) {
    case "loading":
      return 3;
    case "error":
      return 2;
    case "idle":
      return 1;
    case "done":
      return 0;
    default:
      return 0;
  }
}

function contactCompleteness(lead: BulkLead) {
  let score = 0;
  if (lead.email) score += 2;
  if (lead.contactPerson) score += 1;
  if (lead.industry) score += 1;
  return score;
}

function sendRank(lead: BulkLead) {
  if (lead.sendStatus === "sent") return 4;
  if (lead.sendStatus === "loading") return 3;
  if (lead.sendStatus === "error") return 2;
  if (lead.email && lead.qualityStatus === "done") return 1;
  return 0;
}

function sortLeads(leads: BulkLead[], key: BulkSortKey, direction: BulkSortDirection) {
  const sorted = [...leads].sort((a, b) => {
    let result = 0;

    if (key === "company") {
      result = a.company.localeCompare(b.company, "de", { sensitivity: "base" });
    }
    if (key === "analysis") {
      result =
        statusRank(b.analysisStatus) - statusRank(a.analysisStatus) ||
        b.analysisStars - a.analysisStars ||
        a.company.localeCompare(b.company, "de", { sensitivity: "base" });
    }
    if (key === "contacts") {
      result =
        contactCompleteness(b) - contactCompleteness(a) ||
        statusRank(b.contactStatus) - statusRank(a.contactStatus) ||
        a.company.localeCompare(b.company, "de", { sensitivity: "base" });
    }
    if (key === "quality") {
      result =
        Number(b.alreadyContacted) - Number(a.alreadyContacted) ||
        b.qualityStars - a.qualityStars ||
        statusRank(b.qualityStatus) - statusRank(a.qualityStatus) ||
        a.company.localeCompare(b.company, "de", { sensitivity: "base" });
    }
    if (key === "send") {
      result =
        sendRank(b) - sendRank(a) ||
        b.qualityStars - a.qualityStars ||
        a.company.localeCompare(b.company, "de", { sensitivity: "base" });
    }

    return direction === "asc" ? result : result * -1;
  });

  return sorted;
}

function SortLabel({
  label,
  active,
  direction,
  onClick,
}: {
  label: string;
  active: boolean;
  direction: BulkSortDirection;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: "none",
        background: "transparent",
        padding: 0,
        cursor: "pointer",
        fontSize: "13px",
        fontWeight: 700,
        color: "#111827",
        textAlign: "left",
      }}
    >
      {label} {active ? (direction === "asc" ? "↑" : "↓") : "↕"}
    </button>
  );
}

export default function BulkLeadsTableReplacementV3({
  leads,
  onToggleSelected,
  onSetAllSelected,
  onAnalyzeOne,
  onCollectOne,
  onQualityOne,
  onSendOne,
}: Props) {
  const [sortKey, setSortKey] = useState<BulkSortKey>("company");
  const [sortDirection, setSortDirection] = useState<BulkSortDirection>("asc");
  const [analyzeBatch, setAnalyzeBatch] = useState<BatchState>({ active: false, current: 0, total: 0 });
  const [collectBatch, setCollectBatch] = useState<BatchState>({ active: false, current: 0, total: 0 });
  const [qualityBatch, setQualityBatch] = useState<BatchState>({ active: false, current: 0, total: 0 });
  const [sendBatch, setSendBatch] = useState<BatchState>({ active: false, current: 0, total: 0 });

  const selectedLeads = useMemo(() => leads.filter((lead) => lead.selected), [leads]);
  const allSelected = leads.length > 0 && selectedLeads.length === leads.length;
  const sendableSelected = selectedLeads.filter(
    (lead) => lead.email && lead.qualityStatus === "done" && lead.sendStatus !== "sent"
  );
  const sortedLeads = useMemo(() => sortLeads(leads, sortKey, sortDirection), [leads, sortKey, sortDirection]);

  function toggleSort(nextKey: BulkSortKey) {
    if (sortKey === nextKey) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(nextKey);
    setSortDirection("asc");
  }

  async function runBatch(
    items: BulkLead[],
    setState: React.Dispatch<React.SetStateAction<BatchState>>,
    runner: (id: string) => Promise<void> | void
  ) {
    setState({ active: true, current: 0, total: items.length });
    try {
      let index = 0;
      for (const item of items) {
        index += 1;
        setState({ active: true, current: index, total: items.length });
        try {
          await runner(item.id);
        } catch {
          // continue with next row
        }
      }
    } finally {
      setState({ active: false, current: 0, total: 0 });
    }
  }

  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: "12px", overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
          <thead>
            <tr style={{ background: "#f9fafb", textAlign: "left" }}>
              <th style={tableHeadStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "flex-start" }}>
                  <SortLabel label="Auswahl / Unternehmen" active={sortKey === "company"} direction={sortDirection} onClick={() => toggleSort("company")} />
                  <button type="button" onClick={() => onSetAllSelected(!allSelected)} style={smallButtonStyle(false)}>
                    {allSelected ? "Alle abwählen" : "Alle auswählen"}
                  </button>
                </div>
              </th>
              <th style={tableHeadStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "flex-start" }}>
                  <SortLabel label="Analysieren" active={sortKey === "analysis"} direction={sortDirection} onClick={() => toggleSort("analysis")} />
                  <button
                    type="button"
                    onClick={() => runBatch(selectedLeads, setAnalyzeBatch, onAnalyzeOne)}
                    disabled={analyzeBatch.active || selectedLeads.length === 0}
                    style={smallButtonStyle(analyzeBatch.active || selectedLeads.length === 0)}
                  >
                    {analyzeBatch.active ? `Analysiere ${analyzeBatch.current}/${analyzeBatch.total}` : "Alle analysieren"}
                  </button>
                </div>
              </th>
              <th style={tableHeadStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "flex-start" }}>
                  <SortLabel label="Kontaktdaten" active={sortKey === "contacts"} direction={sortDirection} onClick={() => toggleSort("contacts")} />
                  <button
                    type="button"
                    onClick={() => runBatch(selectedLeads, setCollectBatch, onCollectOne)}
                    disabled={collectBatch.active || selectedLeads.length === 0}
                    style={smallButtonStyle(collectBatch.active || selectedLeads.length === 0)}
                  >
                    {collectBatch.active ? `Sammle ${collectBatch.current}/${collectBatch.total}` : "Für alle Daten sammeln"}
                  </button>
                </div>
              </th>
              <th style={tableHeadStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "flex-start" }}>
                  <SortLabel label="Qualität einschätzen" active={sortKey === "quality"} direction={sortDirection} onClick={() => toggleSort("quality")} />
                  <button
                    type="button"
                    onClick={() => runBatch(selectedLeads, setQualityBatch, onQualityOne)}
                    disabled={qualityBatch.active || selectedLeads.length === 0}
                    style={smallButtonStyle(qualityBatch.active || selectedLeads.length === 0)}
                  >
                    {qualityBatch.active ? `Prüfe ${qualityBatch.current}/${qualityBatch.total}` : "Für alle Qualität prüfen"}
                  </button>
                </div>
              </th>
              <th style={tableHeadStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "flex-start" }}>
                  <SortLabel label="Email erstellen und senden" active={sortKey === "send"} direction={sortDirection} onClick={() => toggleSort("send")} />
                  <button
                    type="button"
                    onClick={() => runBatch(sendableSelected, setSendBatch, onSendOne)}
                    disabled={sendBatch.active || sendableSelected.length === 0}
                    style={smallButtonStyle(sendBatch.active || sendableSelected.length === 0)}
                  >
                    {sendBatch.active ? `Sende ${sendBatch.current}/${sendBatch.total}` : "Für alle senden"}
                  </button>
                </div>
              </th>
            </tr>
          </thead>

          <tbody>
            {sortedLeads.map((lead) => (
              <tr key={lead.id}>
                <td style={tableCellStyle}>
                  <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                    <input
                      type="checkbox"
                      checked={lead.selected}
                      onChange={(e) => onToggleSelected(lead.id, e.target.checked)}
                      style={{ marginTop: "3px" }}
                    />
                    <div>
                      <div style={{ fontWeight: 700, marginBottom: "4px" }}>{lead.company}</div>
                      <div style={{ fontSize: "12px", color: "#6b7280", lineHeight: 1.4 }}>{lead.city}</div>
                      <div style={{ marginTop: "4px", fontSize: "12px", color: "#6b7280", lineHeight: 1.4, wordBreak: "break-all" }}>{lead.website}</div>
                    </div>
                  </div>
                </td>
                <td style={tableCellStyle}>
                  <div style={{ fontSize: "18px", fontWeight: 700, color: lead.analysisStars >= 2 ? "#111827" : "#6b7280" }}>{stars(lead.analysisStars)}</div>
                  {lead.analysisSummary && (
                    <div style={{ marginTop: "6px", fontSize: "12px", color: "#6b7280", lineHeight: 1.4 }}>
                      {lead.analysisSummary}
                      {lead.foundJobTitles.length > 0 && (
                        <>
                          <br />Titel: {lead.foundJobTitles.join(", ")}
                        </>
                      )}
                    </div>
                  )}
                </td>
                <td style={tableCellStyle}>
                  {(lead.email || lead.contactPerson || lead.industry) ? (
                    <div style={{ fontSize: "12px", color: "#374151", lineHeight: 1.5, wordBreak: "break-word" }}>
                      <div><strong>Email:</strong> {lead.email || "–"}</div>
                      <div><strong>AP:</strong> {lead.contactPerson || "–"}</div>
                      <div><strong>Branche:</strong> {lead.industry || "–"}</div>
                    </div>
                  ) : (
                    <div style={{ color: "#6b7280", fontSize: "12px" }}>–</div>
                  )}
                </td>
                <td style={tableCellStyle}>
                  <div style={{ marginTop: "2px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ fontSize: "18px", fontWeight: 700 }}>{stars(lead.qualityStars)}</div>
                    {lead.alreadyContacted && <span style={{ color: "#dc2626", fontSize: "18px", fontWeight: 700 }}>❗</span>}
                  </div>
                  {lead.qualitySummary && (
                    <div style={{ marginTop: "6px", fontSize: "12px", color: "#6b7280", lineHeight: 1.4 }}>{lead.qualitySummary}</div>
                  )}
                </td>
                <td style={tableCellStyle}>
                  <button
                    type="button"
                    onClick={() => onSendOne(lead.id)}
                    disabled={!lead.selected || !lead.email || lead.sendStatus === "loading"}
                    style={smallButtonStyle(!lead.selected || !lead.email || lead.sendStatus === "loading")}
                  >
                    {lead.sendStatus === "loading" ? "Sendet..." : "Email erstellen und senden"}
                  </button>
                  <div
                    style={{
                      marginTop: "10px",
                      fontSize: "12px",
                      fontWeight: 600,
                      color: lead.sendStatus === "sent" ? "#166534" : lead.sendStatus === "error" ? "#b91c1c" : "#6b7280",
                    }}
                  >
                    {lead.sendStatus === "sent" ? "gesendet" : lead.sendStatus === "error" ? "Fehler" : "–"}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
