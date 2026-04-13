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
};

type BulkTextBlock = {
  id: string;
  title: string;
  text: string;
};

const BULK_TEXT_BLOCKS_KEY = "bulkTextBlocksV1";

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

export default function CrmPage() {
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [bulkTextBlocks, setBulkTextBlocks] = useState<BulkTextBlock[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedLead, setSelectedLead] = useState<LeadRecord | null>(null);
  const [reminderLead, setReminderLead] = useState<LeadRecord | null>(null);
  const [activeBlockIds, setActiveBlockIds] = useState<string[]>([]);
  const [shortMode, setShortMode] = useState(false);
  const [testMode, setTestMode] = useState(true);
  const [sendingReminder, setSendingReminder] = useState(false);

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

  async function handleSendReminder() {
    if (!reminderLead) return;

    try {
      setSendingReminder(true);
      setError("");
      setSuccessMessage("");

      const response = await fetch("/api/crm/send-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: reminderLead.id,
          shortMode,
          testMode,
          textBlocks: activeBlocks,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Erinnerung konnte nicht gesendet werden.");
        return;
      }

      setSuccessMessage(
        testMode
          ? `Erinnerung fuer "${reminderLead.company}" wurde an den Test-Empfaenger gesendet.`
          : `Erinnerung fuer "${reminderLead.company}" wurde gesendet.`
      );
      setReminderLead(null);
      await loadLeads();
    } catch {
      setError("Erinnerung konnte nicht gesendet werden.");
    } finally {
      setSendingReminder(false);
    }
  }

  return (
    <>
      {error ? <div style={{ marginBottom: "18px", color: "#b91c1c", fontWeight: 600 }}>{error}</div> : null}
      {successMessage ? <div style={{ marginBottom: "18px", color: "#166534", fontWeight: 600 }}>{successMessage}</div> : null}

      <div style={{ background: "#ffffff", border: "1px solid #d1d5db", borderRadius: "14px", padding: "20px", boxSizing: "border-box" }}>
        <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "18px" }}>CRM</div>

        {loading ? (
          <div style={{ fontSize: "14px", color: "#6b7280" }}>CRM wird geladen...</div>
        ) : leads.length === 0 ? (
          <div style={{ fontSize: "14px", color: "#6b7280" }}>Noch keine Leads vorhanden.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "14px" }}>
            {leads.map((lead) => (
              <div key={lead.id} style={{ border: "1px solid #e5e7eb", borderRadius: "12px", padding: "16px", background: "#ffffff" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start", marginBottom: "10px" }}>
                  <div>
                    <div style={{ fontSize: "16px", fontWeight: 700, marginBottom: "4px" }}>{lead.company || "Unbekannter Lead"}</div>
                    <div style={{ fontSize: "12px", color: "#6b7280" }}>{channelLabel(lead.channel)}</div>
                  </div>
                  <div style={{ fontSize: "12px", color: "#6b7280" }}>{lead.mails.length} Mails</div>
                </div>

                <div style={{ display: "grid", gap: "6px", fontSize: "13px", color: "#374151", marginBottom: "14px" }}>
                  <div><strong>Email:</strong> {lead.recipientEmail || "-"}</div>
                  <div><strong>PLZ:</strong> {lead.postalCode || "-"}</div>
                  <div><strong>Ort:</strong> {lead.city || "-"}</div>
                  <div><strong>Telefon:</strong> {lead.phone || "-"}</div>
                  <div><strong>Website:</strong> {lead.website || "-"}</div>
                  <div><strong>Ansprechpartner:</strong> {lead.contactPerson || "-"}</div>
                  <div><strong>Branche:</strong> {lead.industry || "-"}</div>
                </div>

                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <button type="button" onClick={() => setSelectedLead(lead)} style={buttonStyle(false)}>
                    Gesendete Emails
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setReminderLead(lead);
                      setActiveBlockIds([]);
                      setShortMode(false);
                      setTestMode(true);
                    }}
                    style={buttonStyle(true)}
                  >
                    Erinnerung schicken
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedLead ? (
        <div onClick={() => setSelectedLead(null)} style={{ position: "fixed", inset: 0, background: "rgba(17, 24, 39, 0.45)", zIndex: 50, padding: "24px", overflowY: "auto" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: "860px", margin: "40px auto", background: "#ffffff", borderRadius: "14px", padding: "20px", boxSizing: "border-box" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", alignItems: "flex-start", marginBottom: "18px" }}>
              <div>
                <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "4px" }}>{selectedLead.company || "Lead"}</div>
                <div style={{ color: "#374151", fontSize: "14px" }}>{selectedLead.recipientEmail || "-"}</div>
              </div>
              <button type="button" onClick={() => setSelectedLead(null)} style={buttonStyle(false)}>Schliessen</button>
            </div>

            <div style={{ display: "grid", gap: "10px", marginBottom: "18px", fontSize: "14px" }}>
              <div><strong>PLZ / Ort:</strong> {[selectedLead.postalCode, selectedLead.city].filter(Boolean).join(" ") || "-"}</div>
              <div><strong>Kanal:</strong> {channelLabel(selectedLead.channel)}</div>
              <div><strong>Telefon:</strong> {selectedLead.phone || "-"}</div>
              <div><strong>Website:</strong> {selectedLead.website || "-"}</div>
            </div>

            <div style={{ display: "grid", gap: "12px" }}>
              {selectedLead.mails.length === 0 ? (
                <div style={{ fontSize: "14px", color: "#6b7280" }}>Noch keine gesendeten E-Mails vorhanden.</div>
              ) : (
                selectedLead.mails.map((mail) => (
                  <div key={mail.id} style={{ border: "1px solid #e5e7eb", borderRadius: "12px", padding: "14px", background: "#f9fafb" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", marginBottom: "8px", flexWrap: "wrap" }}>
                      <div style={{ fontWeight: 700 }}>{mail.subject || "Ohne Betreff"}</div>
                      <div style={{ fontSize: "12px", color: "#6b7280" }}>{formatDate(mail.createdAt)}</div>
                    </div>
                    <div style={{ display: "grid", gap: "6px", fontSize: "13px", color: "#374151", marginBottom: "10px" }}>
                      <div><strong>Kanal:</strong> {channelLabel(mail.channel)}</div>
                      <div><strong>Kurze Mail:</strong> {mail.shortMode ? "Ja" : "Nein"}</div>
                      <div><strong>Testmodus:</strong> {mail.testMode ? "Ja" : "Nein"}</div>
                      <div><strong>Text-Bausteine:</strong> {mail.textBlockTitles.length ? mail.textBlockTitles.join(", ") : "-"}</div>
                    </div>
                    <div style={{ whiteSpace: "pre-wrap", background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "12px", fontSize: "14px", lineHeight: 1.5 }}>
                      {mail.bodyText || "Kein gespeicherter Inhalt vorhanden."}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}

      {reminderLead ? (
        <div onClick={() => !sendingReminder && setReminderLead(null)} style={{ position: "fixed", inset: 0, background: "rgba(17, 24, 39, 0.45)", zIndex: 55, padding: "24px", overflowY: "auto" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: "720px", margin: "40px auto", background: "#ffffff", borderRadius: "14px", padding: "20px", boxSizing: "border-box" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", alignItems: "flex-start", marginBottom: "18px" }}>
              <div>
                <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "4px" }}>Erinnerung schicken</div>
                <div style={{ color: "#374151", fontSize: "14px" }}>{reminderLead.company || reminderLead.recipientEmail}</div>
              </div>
              <button type="button" onClick={() => setReminderLead(null)} style={buttonStyle(false, sendingReminder)}>Schliessen</button>
            </div>

            <div style={{ display: "grid", gap: "14px", marginBottom: "18px" }}>
              <label style={{ fontSize: "14px", cursor: "pointer" }}>
                <input type="checkbox" checked={testMode} onChange={(e) => setTestMode(e.target.checked)} style={{ marginRight: "6px" }} />
                Testmodus
              </label>
              <label style={{ fontSize: "14px", cursor: "pointer" }}>
                <input type="checkbox" checked={shortMode} onChange={(e) => setShortMode(e.target.checked)} style={{ marginRight: "6px" }} />
                Kurze Mail
              </label>
              <div>
                <div style={{ fontWeight: 600, marginBottom: "8px" }}>Streumail-Textbausteine</div>
                {bulkTextBlocks.length === 0 ? (
                  <div style={{ fontSize: "13px", color: "#6b7280" }}>Noch keine Bausteine vorhanden.</div>
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
              <button type="button" onClick={() => setReminderLead(null)} style={buttonStyle(false, sendingReminder)}>
                Abbrechen
              </button>
              <button type="button" onClick={handleSendReminder} disabled={sendingReminder} style={buttonStyle(true, sendingReminder)}>
                {sendingReminder ? "Wird gesendet..." : "Erinnerung senden"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
