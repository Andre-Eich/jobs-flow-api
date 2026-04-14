"use client";

import { useEffect, useMemo, useState } from "react";

type LeadMailRecord = {
  id: string;
  emailId: string;
  createdAt: string;
  subject: string;
  bodyText: string;
  textBlockTitles: string[];
  shortMode: boolean;
  testMode: boolean;
  channel: "kaltakquise" | "streumail";
  followUp: boolean;
  originalEmailId: string;
};

type LeadRecord = {
  id: string;
  company: string;
  postalCode: string;
  city: string;
  recipientEmail: string;
  phone: string;
  website: string;
  contactPerson: string;
  industry: string;
  channel: "kaltakquise" | "streumail" | "mixed";
  createdAt: string;
  updatedAt: string;
  mails: LeadMailRecord[];
  openedCount?: number;
  sentCount?: number;
  openRate?: number;
};

type BulkTextBlock = {
  id: string;
  title: string;
  text: string;
};

const BULK_TEXT_BLOCKS_KEY = "bulkTextBlocksV1";
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
type CrmSortKey =
  | "company"
  | "email"
  | "postalCode"
  | "city"
  | "phone"
  | "channel"
  | "mails"
  | "openRate"
  | "updatedAt";
type CrmSortDirection = "asc" | "desc";

function formatDate(dateString: string) {
  try {
    return new Date(dateString).toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateString;
  }
}

function channelLabel(value: LeadRecord["channel"] | LeadMailRecord["channel"]) {
  if (value === "streumail") return "Streumail";
  if (value === "mixed") return "Gemischt";
  return "Kaltakquise";
}

function buttonStyle(primary = false, disabled = false): React.CSSProperties {
  return {
    padding: "10px 14px",
    borderRadius: "8px",
    border: primary ? "none" : "1px solid #cbd5e1",
    background: primary ? "#111827" : "#ffffff",
    color: primary ? "#ffffff" : "#111827",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: "14px",
    opacity: disabled ? 0.65 : 1,
  };
}

function formatPercent(value: number) {
  return `${Math.round((value || 0) * 100)} %`;
}

function SortButton({
  label,
  active,
  direction,
  onClick,
}: {
  label: string;
  active: boolean;
  direction: CrmSortDirection;
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
        whiteSpace: "nowrap",
      }}
    >
      {label} {active ? (direction === "asc" ? "↑" : "↓") : "↕"}
    </button>
  );
}

function compareStrings(a: string, b: string) {
  return a.localeCompare(b, "de", { sensitivity: "base" });
}

const tableHeadStyle: React.CSSProperties = {
  padding: "12px 14px",
  fontSize: "13px",
  fontWeight: 700,
  color: "#111827",
  borderBottom: "1px solid #e5e7eb",
  verticalAlign: "top",
  background: "#f9fafb",
  textAlign: "left",
  whiteSpace: "nowrap",
};

const tableCellStyle: React.CSSProperties = {
  padding: "12px 14px",
  verticalAlign: "top",
  borderBottom: "1px solid #f3f4f6",
  fontSize: "14px",
};

export default function CrmPage() {
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [bulkTextBlocks, setBulkTextBlocks] = useState<BulkTextBlock[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedLead, setSelectedLead] = useState<LeadRecord | null>(null);
  const [reminderTargets, setReminderTargets] = useState<LeadRecord[]>([]);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [activeBlockIds, setActiveBlockIds] = useState<string[]>([]);
  const [shortMode, setShortMode] = useState(false);
  const [testMode, setTestMode] = useState(true);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<CrmSortKey>("updatedAt");
  const [sortDirection, setSortDirection] = useState<CrmSortDirection>("desc");

  async function loadLeads() {
    try {
      setLoading(true);
      const response = await fetch("/api/crm/leads");
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "CRM konnte nicht geladen werden.");
        return;
      }
      setLeads(Array.isArray(data.leads) ? data.leads : []);
    } catch {
      setError("CRM konnte nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLeads();
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(BULK_TEXT_BLOCKS_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return;
      setBulkTextBlocks(
        parsed
          .map((item) => ({
            id: String(item?.id || ""),
            title: String(item?.title || "").trim(),
            text: String(item?.text || "").trim(),
          }))
          .filter((item) => item.id && (item.title || item.text))
      );
    } catch {
      // ignore
    }
  }, []);

  const activeBlocks = useMemo(
    () => bulkTextBlocks.filter((block) => activeBlockIds.includes(block.id)),
    [bulkTextBlocks, activeBlockIds]
  );

  const sortedLeads = useMemo(() => {
    return [...leads].sort((a, b) => {
      let result = 0;

      if (sortKey === "company") {
        result = compareStrings(a.company || "", b.company || "");
      } else if (sortKey === "email") {
        result = compareStrings(a.recipientEmail || "", b.recipientEmail || "");
      } else if (sortKey === "postalCode") {
        result = compareStrings(a.postalCode || "", b.postalCode || "");
      } else if (sortKey === "city") {
        result = compareStrings(a.city || "", b.city || "");
      } else if (sortKey === "phone") {
        result = compareStrings(a.phone || "", b.phone || "");
      } else if (sortKey === "channel") {
        result = compareStrings(channelLabel(a.channel), channelLabel(b.channel));
      } else if (sortKey === "mails") {
        result = (a.mails.length || 0) - (b.mails.length || 0);
      } else if (sortKey === "openRate") {
        result =
          (a.openRate || 0) - (b.openRate || 0) ||
          (a.openedCount || 0) - (b.openedCount || 0);
      } else {
        result = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      }

      if (result === 0) {
        result = compareStrings(a.company || "", b.company || "");
      }

      return sortDirection === "asc" ? result : result * -1;
    });
  }, [leads, sortDirection, sortKey]);

  const totalPages = Math.max(1, Math.ceil(sortedLeads.length / pageSize));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedLeads.slice(start, start + pageSize);
  }, [currentPage, pageSize, sortedLeads]);

  const selectedLeads = useMemo(
    () => leads.filter((lead) => selectedLeadIds.includes(lead.id)),
    [leads, selectedLeadIds]
  );

  function toggleSort(nextKey: CrmSortKey) {
    if (sortKey === nextKey) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(nextKey);
    setSortDirection(nextKey === "updatedAt" ? "desc" : "asc");
  }

  const allCurrentPageSelected =
    paginatedLeads.length > 0 &&
    paginatedLeads.every((lead) => selectedLeadIds.includes(lead.id));

  function toggleLeadSelected(id: string, selected: boolean) {
    setSelectedLeadIds((prev) =>
      selected ? (prev.includes(id) ? prev : [...prev, id]) : prev.filter((item) => item !== id)
    );
  }

  function selectAllCurrentPage() {
    setSelectedLeadIds((prev) => {
      const next = new Set(prev);
      for (const lead of paginatedLeads) {
        next.add(lead.id);
      }
      return Array.from(next);
    });
  }

  function clearAllCurrentPage() {
    setSelectedLeadIds((prev) =>
      prev.filter((id) => !paginatedLeads.some((lead) => lead.id === id))
    );
  }

  function openReminderModal(targets: LeadRecord[]) {
    setReminderTargets(targets);
    setActiveBlockIds([]);
    setShortMode(false);
    setTestMode(true);
  }

  async function handleSendReminder() {
    if (reminderTargets.length === 0) return;

    try {
      setSendingReminder(true);
      setError("");
      setSuccessMessage("");

      let successCount = 0;

      for (const lead of reminderTargets) {
        const response = await fetch("/api/crm/send-reminder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            leadId: lead.id,
            shortMode,
            testMode,
            textBlocks: activeBlocks,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          setError(data.error || `Erinnerung fuer "${lead.company}" konnte nicht gesendet werden.`);
          return;
        }

        successCount += 1;
      }

      setSuccessMessage(
        testMode
          ? `${successCount} Erinnerung${successCount === 1 ? "" : "en"} wurde${successCount === 1 ? "" : "n"} an den Test-Empfaenger gesendet.`
          : `${successCount} Erinnerung${successCount === 1 ? "" : "en"} wurde${successCount === 1 ? "" : "n"} gesendet.`
      );

      setReminderTargets([]);
      setSelectedLeadIds([]);
      await loadLeads();
    } catch {
      setError("Erinnerungen konnten nicht gesendet werden.");
    } finally {
      setSendingReminder(false);
    }
  }

  return (
    <>
      {error ? (
        <div style={{ marginBottom: "18px", color: "#b91c1c", fontWeight: 600 }}>{error}</div>
      ) : null}
      {successMessage ? (
        <div style={{ marginBottom: "18px", color: "#166534", fontWeight: 600 }}>
          {successMessage}
        </div>
      ) : null}

      <div
        style={{
          background: "#ffffff",
          border: "1px solid #d1d5db",
          borderRadius: "14px",
          padding: "20px",
          boxSizing: "border-box",
        }}
      >
        <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "18px" }}>CRM</div>

        {loading ? (
          <div style={{ fontSize: "14px", color: "#6b7280" }}>CRM wird geladen...</div>
        ) : leads.length === 0 ? (
          <div style={{ fontSize: "14px", color: "#6b7280" }}>Noch keine Leads vorhanden.</div>
        ) : (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "14px",
                flexWrap: "wrap",
                marginBottom: "16px",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
                <label style={{ fontSize: "14px", fontWeight: 600 }}>
                  Leads pro Seite{" "}
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    style={{
                      marginLeft: "8px",
                      padding: "8px 10px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      background: "#ffffff",
                    }}
                  >
                    {PAGE_SIZE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <div style={{ fontSize: "13px", color: "#6b7280" }}>
                  {selectedLeads.length} ausgewaehlt von {leads.length}
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={allCurrentPageSelected ? clearAllCurrentPage : selectAllCurrentPage}
                  style={buttonStyle(false)}
                >
                  {allCurrentPageSelected ? "Alle abwaehlen" : "Alle auswaehlen"}
                </button>
                <button
                  type="button"
                  onClick={() => openReminderModal(selectedLeads)}
                  disabled={selectedLeads.length === 0}
                  style={buttonStyle(true, selectedLeads.length === 0)}
                >
                  Erinnerung schicken
                </button>
              </div>
            </div>

            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                overflow: "hidden",
                marginBottom: "16px",
              }}
            >
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1100px" }}>
                  <thead>
                    <tr>
                      <th style={tableHeadStyle}>
                        <input
                          type="checkbox"
                          checked={allCurrentPageSelected}
                          onChange={(e) =>
                            e.target.checked ? selectAllCurrentPage() : clearAllCurrentPage()
                          }
                        />
                      </th>
                      <th style={tableHeadStyle}>
                        <SortButton label="Unternehmen" active={sortKey === "company"} direction={sortDirection} onClick={() => toggleSort("company")} />
                      </th>
                      <th style={tableHeadStyle}>
                        <SortButton label="Email" active={sortKey === "email"} direction={sortDirection} onClick={() => toggleSort("email")} />
                      </th>
                      <th style={tableHeadStyle}>
                        <SortButton label="PLZ" active={sortKey === "postalCode"} direction={sortDirection} onClick={() => toggleSort("postalCode")} />
                      </th>
                      <th style={tableHeadStyle}>
                        <SortButton label="Ort" active={sortKey === "city"} direction={sortDirection} onClick={() => toggleSort("city")} />
                      </th>
                      <th style={tableHeadStyle}>
                        <SortButton label="Telefon" active={sortKey === "phone"} direction={sortDirection} onClick={() => toggleSort("phone")} />
                      </th>
                      <th style={tableHeadStyle}>
                        <SortButton label="Kanal" active={sortKey === "channel"} direction={sortDirection} onClick={() => toggleSort("channel")} />
                      </th>
                      <th style={tableHeadStyle}>
                        <SortButton label="Mails" active={sortKey === "mails"} direction={sortDirection} onClick={() => toggleSort("mails")} />
                      </th>
                      <th style={tableHeadStyle}>
                        <SortButton label="Öffnungsrate" active={sortKey === "openRate"} direction={sortDirection} onClick={() => toggleSort("openRate")} />
                      </th>
                      <th style={tableHeadStyle}>
                        <SortButton label="Letzte Aktivitaet" active={sortKey === "updatedAt"} direction={sortDirection} onClick={() => toggleSort("updatedAt")} />
                      </th>
                      <th style={tableHeadStyle}>Aktionen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedLeads.map((lead) => {
                      const checked = selectedLeadIds.includes(lead.id);
                      return (
                        <tr key={lead.id}>
                          <td style={tableCellStyle}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => toggleLeadSelected(lead.id, e.target.checked)}
                            />
                          </td>
                          <td style={tableCellStyle}>
                            <div style={{ fontWeight: 700, marginBottom: "4px" }}>
                              {lead.company || "Unbekannter Lead"}
                            </div>
                            <div style={{ fontSize: "12px", color: "#6b7280" }}>
                              {lead.contactPerson || "-"}
                            </div>
                          </td>
                          <td style={tableCellStyle}>{lead.recipientEmail || "-"}</td>
                          <td style={tableCellStyle}>{lead.postalCode || "-"}</td>
                          <td style={tableCellStyle}>{lead.city || "-"}</td>
                          <td style={tableCellStyle}>{lead.phone || "-"}</td>
                          <td style={tableCellStyle}>{channelLabel(lead.channel)}</td>
                          <td style={tableCellStyle}>{lead.mails.length}</td>
                          <td style={tableCellStyle}>
                            <div style={{ fontWeight: 600 }}>{formatPercent(lead.openRate || 0)}</div>
                            <div style={{ fontSize: "12px", color: "#6b7280" }}>
                              {lead.openedCount || 0} von {lead.sentCount || lead.mails.length}
                            </div>
                          </td>
                          <td style={tableCellStyle}>{formatDate(lead.updatedAt)}</td>
                          <td style={tableCellStyle}>
                            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                              <button
                                type="button"
                                onClick={() => setSelectedLead(lead)}
                                style={buttonStyle(false)}
                              >
                                Gesendete Emails
                              </button>
                              <button
                                type="button"
                                onClick={() => openReminderModal([lead])}
                                style={buttonStyle(true)}
                              >
                                Erinnerung schicken
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "12px",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div style={{ fontSize: "13px", color: "#6b7280" }}>
                Seite {currentPage} von {totalPages}
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  style={buttonStyle(false, currentPage === 1)}
                >
                  Zurueck
                </button>
                {Array.from({ length: totalPages }, (_, index) => index + 1)
                  .slice(Math.max(0, currentPage - 3), Math.max(0, currentPage - 3) + 5)
                  .map((page) => (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      style={{
                        ...buttonStyle(page === currentPage, false),
                        minWidth: "44px",
                        padding: "8px 10px",
                      }}
                    >
                      {page}
                    </button>
                  ))}
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  style={buttonStyle(false, currentPage === totalPages)}
                >
                  Weiter
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {selectedLead ? (
        <div
          onClick={() => setSelectedLead(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(17, 24, 39, 0.45)",
            zIndex: 50,
            padding: "24px",
            overflowY: "auto",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "860px",
              margin: "40px auto",
              background: "#ffffff",
              borderRadius: "14px",
              padding: "20px",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "16px",
                alignItems: "flex-start",
                marginBottom: "18px",
              }}
            >
              <div>
                <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "4px" }}>
                  {selectedLead.company || "Lead"}
                </div>
                <div style={{ color: "#374151", fontSize: "14px" }}>
                  {selectedLead.recipientEmail || "-"}
                </div>
              </div>
              <button type="button" onClick={() => setSelectedLead(null)} style={buttonStyle(false)}>
                Schliessen
              </button>
            </div>

            <div style={{ display: "grid", gap: "10px", marginBottom: "18px", fontSize: "14px" }}>
              <div>
                <strong>PLZ / Ort:</strong>{" "}
                {[selectedLead.postalCode, selectedLead.city].filter(Boolean).join(" ") || "-"}
              </div>
              <div>
                <strong>Kanal:</strong> {channelLabel(selectedLead.channel)}
              </div>
              <div>
                <strong>Telefon:</strong> {selectedLead.phone || "-"}
              </div>
              <div>
                <strong>Website:</strong> {selectedLead.website || "-"}
              </div>
            </div>

            <div style={{ display: "grid", gap: "12px" }}>
              {selectedLead.mails.length === 0 ? (
                <div style={{ fontSize: "14px", color: "#6b7280" }}>
                  Noch keine gesendeten E-Mails vorhanden.
                </div>
              ) : (
                selectedLead.mails.map((mail) => (
                  <div
                    key={mail.id}
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: "12px",
                      padding: "14px",
                      background: "#f9fafb",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "12px",
                        marginBottom: "8px",
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ fontWeight: 700 }}>{mail.subject || "Ohne Betreff"}</div>
                      <div style={{ fontSize: "12px", color: "#6b7280" }}>
                        {formatDate(mail.createdAt)}
                      </div>
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gap: "6px",
                        fontSize: "13px",
                        color: "#374151",
                        marginBottom: "10px",
                      }}
                    >
                      <div>
                        <strong>Kanal:</strong> {channelLabel(mail.channel)}
                      </div>
                      <div>
                        <strong>Kurze Mail:</strong> {mail.shortMode ? "Ja" : "Nein"}
                      </div>
                      <div>
                        <strong>Testmodus:</strong> {mail.testMode ? "Ja" : "Nein"}
                      </div>
                      <div>
                        <strong>Text-Bausteine:</strong>{" "}
                        {mail.textBlockTitles.length ? mail.textBlockTitles.join(", ") : "-"}
                      </div>
                    </div>
                    <div
                      style={{
                        whiteSpace: "pre-wrap",
                        background: "#ffffff",
                        border: "1px solid #e5e7eb",
                        borderRadius: "10px",
                        padding: "12px",
                        fontSize: "14px",
                        lineHeight: 1.5,
                      }}
                    >
                      {mail.bodyText || "Kein gespeicherter Inhalt vorhanden."}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}

      {reminderTargets.length > 0 ? (
        <div
          onClick={() => !sendingReminder && setReminderTargets([])}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(17, 24, 39, 0.45)",
            zIndex: 55,
            padding: "24px",
            overflowY: "auto",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "720px",
              margin: "40px auto",
              background: "#ffffff",
              borderRadius: "14px",
              padding: "20px",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "16px",
                alignItems: "flex-start",
                marginBottom: "18px",
              }}
            >
              <div>
                <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "4px" }}>
                  Erinnerung schicken
                </div>
                <div style={{ color: "#374151", fontSize: "14px" }}>
                  {reminderTargets.length} Lead
                  {reminderTargets.length === 1 ? "" : "s"} ausgewaehlt
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReminderTargets([])}
                style={buttonStyle(false, sendingReminder)}
              >
                Schliessen
              </button>
            </div>

            <div style={{ fontSize: "13px", color: "#374151", marginBottom: "14px" }}>
              {reminderTargets
                .slice(0, 6)
                .map((lead) => lead.company || lead.recipientEmail)
                .join(", ")}
              {reminderTargets.length > 6 ? ` und ${reminderTargets.length - 6} weitere` : ""}
            </div>

            <div style={{ display: "grid", gap: "14px", marginBottom: "18px" }}>
              <label style={{ fontSize: "14px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={testMode}
                  onChange={(e) => setTestMode(e.target.checked)}
                  style={{ marginRight: "6px" }}
                />
                Testmodus
              </label>
              <label style={{ fontSize: "14px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={shortMode}
                  onChange={(e) => setShortMode(e.target.checked)}
                  style={{ marginRight: "6px" }}
                />
                Kurze Mail
              </label>
              <div>
                <div style={{ fontWeight: 600, marginBottom: "8px" }}>Streumail-Textbausteine</div>
                {bulkTextBlocks.length === 0 ? (
                  <div style={{ fontSize: "13px", color: "#6b7280" }}>
                    Noch keine Bausteine vorhanden.
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {bulkTextBlocks.map((block) => {
                      const active = activeBlockIds.includes(block.id);
                      return (
                        <button
                          key={block.id}
                          type="button"
                          onClick={() =>
                            setActiveBlockIds((prev) =>
                              prev.includes(block.id)
                                ? prev.filter((item) => item !== block.id)
                                : [...prev, block.id]
                            )
                          }
                          style={{
                            ...buttonStyle(false),
                            padding: "6px 10px",
                            borderRadius: "999px",
                            background: active ? "#111827" : "#ffffff",
                            color: active ? "#ffffff" : "#111827",
                          }}
                        >
                          {block.title}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setReminderTargets([])}
                style={buttonStyle(false, sendingReminder)}
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleSendReminder}
                disabled={sendingReminder}
                style={buttonStyle(true, sendingReminder)}
              >
                {sendingReminder
                  ? "Wird gesendet..."
                  : `Erinnerung an ${reminderTargets.length} Lead${
                      reminderTargets.length === 1 ? "" : "s"
                    } senden`}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
