"use client";

import { useEffect, useMemo, useState } from "react";

type PromptTextArea =
  | "kaltakquise"
  | "streumail"
  | "erinnerungen"
  | "crm"
  | "service-text"
  | "text-generator";

type PromptTextEntry = {
  id: string;
  area: PromptTextArea;
  title: string;
  description: string;
  preview: string;
  content: string;
  usage: string;
  placeholders: string[];
  status: "aktiv" | "entwurf";
  updatedAt: string;
};

const AREA_OPTIONS: Array<{ key: PromptTextArea; label: string }> = [
  { key: "kaltakquise", label: "Kaltakquise-Mails" },
  { key: "streumail", label: "Streumails" },
  { key: "erinnerungen", label: "Erinnerungen" },
  { key: "crm", label: "CRM" },
  { key: "service-text", label: "Service Text" },
  { key: "text-generator", label: "Text Generator" },
];

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

function smallButtonStyle(active = false): React.CSSProperties {
  return {
    padding: "9px 12px",
    borderRadius: "999px",
    border: `1px solid ${active ? "#111827" : "#cbd5e1"}`,
    background: active ? "#111827" : "#ffffff",
    color: active ? "#ffffff" : "#111827",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 600,
  };
}

export default function PromptsTextPage() {
  const [entries, setEntries] = useState<PromptTextEntry[]>([]);
  const [activeArea, setActiveArea] = useState<PromptTextArea>("kaltakquise");
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [draftEntry, setDraftEntry] = useState<PromptTextEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function loadEntries() {
    try {
      setLoading(true);
      setError("");
      const response = await fetch("/api/prompts-text");
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Prompts & Texte konnten nicht geladen werden.");
        return;
      }

      setEntries(Array.isArray(data.entries) ? data.entries : []);
    } catch {
      setError("Prompts & Texte konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEntries();
  }, []);

  const filteredEntries = useMemo(
    () => entries.filter((entry) => entry.area === activeArea),
    [entries, activeArea]
  );

  const selectedEntry = useMemo(
    () => entries.find((entry) => entry.id === selectedEntryId) || null,
    [entries, selectedEntryId]
  );

  function openEntry(entry: PromptTextEntry) {
    setSelectedEntryId(entry.id);
    setDraftEntry({ ...entry });
    setError("");
    setSuccessMessage("");
  }

  async function saveEntry() {
    if (!draftEntry) return;

    try {
      setSaving(true);
      setError("");
      setSuccessMessage("");

      const response = await fetch("/api/prompts-text", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draftEntry,
          placeholders: draftEntry.placeholders,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Eintrag konnte nicht gespeichert werden.");
        return;
      }

      const updated = data.entry as PromptTextEntry;
      setEntries((prev) => prev.map((entry) => (entry.id === updated.id ? updated : entry)));
      setDraftEntry(updated);
      setSuccessMessage(`"${updated.title}" wurde gespeichert.`);
    } catch {
      setError("Eintrag konnte nicht gespeichert werden.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: "22px" }}>Prompts & Texte</h1>
            <div style={{ marginTop: "8px", color: "#6b7280", fontSize: "14px", maxWidth: "820px" }}>
              Zentrale Pflege fuer Prompt-Logiken, Mailtexte, Betreffvarianten, Footer und
              weitere wiederverwendete Textbausteine.
            </div>
          </div>
          <div style={{ fontSize: "13px", color: "#6b7280" }}>
            {entries.length} Eintraege insgesamt
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
            padding: "14px",
            borderRadius: "14px",
            border: "1px solid #d1d5db",
            background: "#ffffff",
          }}
        >
          {AREA_OPTIONS.map((area) => (
            <button
              key={area.key}
              type="button"
              onClick={() => setActiveArea(area.key)}
              style={smallButtonStyle(activeArea === area.key)}
            >
              {area.label}
            </button>
          ))}
        </div>

        {error ? <div style={{ color: "#b91c1c", fontWeight: 600 }}>{error}</div> : null}
        {successMessage ? (
          <div style={{ color: "#166534", fontWeight: 600 }}>{successMessage}</div>
        ) : null}

        {loading ? (
          <div style={{ color: "#6b7280" }}>Prompts & Texte werden geladen...</div>
        ) : filteredEntries.length === 0 ? (
          <div style={{ color: "#6b7280" }}>Fuer diesen Bereich gibt es noch keine Eintraege.</div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "16px",
            }}
          >
            {filteredEntries.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => openEntry(entry)}
                style={{
                  textAlign: "left",
                  border: "1px solid #d1d5db",
                  borderRadius: "16px",
                  background: "#ffffff",
                  padding: "18px",
                  cursor: "pointer",
                  boxSizing: "border-box",
                  minHeight: "220px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "12px",
                    marginBottom: "12px",
                  }}
                >
                  <div style={{ fontSize: "17px", fontWeight: 700, lineHeight: 1.3 }}>
                    {entry.title}
                  </div>
                  <div
                    style={{
                      padding: "4px 8px",
                      borderRadius: "999px",
                      background: entry.status === "aktiv" ? "#dcfce7" : "#f3f4f6",
                      color: entry.status === "aktiv" ? "#166534" : "#4b5563",
                      fontSize: "11px",
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {entry.status}
                  </div>
                </div>
                <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "10px" }}>
                  {AREA_OPTIONS.find((item) => item.key === entry.area)?.label || entry.area}
                </div>
                <div style={{ fontSize: "14px", color: "#374151", lineHeight: 1.5, marginBottom: "12px" }}>
                  {entry.description}
                </div>
                <div
                  style={{
                    fontSize: "13px",
                    color: "#111827",
                    lineHeight: 1.5,
                    whiteSpace: "pre-wrap",
                    display: "-webkit-box",
                    WebkitLineClamp: 5,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    marginBottom: "14px",
                  }}
                >
                  {entry.preview}
                </div>
                <div style={{ fontSize: "12px", color: "#6b7280" }}>
                  Letzte Aenderung: {formatDate(entry.updatedAt)}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedEntry && draftEntry ? (
        <div
          onClick={() => {
            setSelectedEntryId(null);
            setDraftEntry(null);
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(17, 24, 39, 0.45)",
            zIndex: 60,
            padding: "24px",
            overflowY: "auto",
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              maxWidth: "920px",
              margin: "24px auto",
              background: "#ffffff",
              borderRadius: "18px",
              padding: "22px",
              boxSizing: "border-box",
              border: "1px solid #e5e7eb",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "16px",
                marginBottom: "18px",
              }}
            >
              <div>
                <div style={{ fontSize: "22px", fontWeight: 700, marginBottom: "6px" }}>
                  {selectedEntry.title}
                </div>
                <div style={{ color: "#6b7280", fontSize: "14px" }}>{selectedEntry.description}</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedEntryId(null);
                  setDraftEntry(null);
                }}
                style={{
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  borderRadius: "8px",
                  padding: "8px 10px",
                  cursor: "pointer",
                }}
              >
                Schliessen
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "16px",
                marginBottom: "16px",
              }}
            >
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}>
                  Titel
                </label>
                <input
                  value={draftEntry.title}
                  onChange={(event) =>
                    setDraftEntry((prev) => (prev ? { ...prev, title: event.target.value } : prev))
                  }
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}>
                  Status
                </label>
                <select
                  value={draftEntry.status}
                  onChange={(event) =>
                    setDraftEntry((prev) =>
                      prev
                        ? { ...prev, status: event.target.value === "entwurf" ? "entwurf" : "aktiv" }
                        : prev
                    )
                  }
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    boxSizing: "border-box",
                    background: "#ffffff",
                  }}
                >
                  <option value="aktiv">aktiv</option>
                  <option value="entwurf">entwurf</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}>
                Kurzbeschreibung
              </label>
              <textarea
                value={draftEntry.description}
                onChange={(event) =>
                  setDraftEntry((prev) =>
                    prev ? { ...prev, description: event.target.value } : prev
                  )
                }
                rows={2}
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  boxSizing: "border-box",
                  resize: "vertical",
                }}
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}>
                Karten-Vorschau
              </label>
              <textarea
                value={draftEntry.preview}
                onChange={(event) =>
                  setDraftEntry((prev) => (prev ? { ...prev, preview: event.target.value } : prev))
                }
                rows={4}
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  boxSizing: "border-box",
                  resize: "vertical",
                }}
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}>
                Vollstaendiger Prompt / Text
              </label>
              <textarea
                value={draftEntry.content}
                onChange={(event) =>
                  setDraftEntry((prev) => (prev ? { ...prev, content: event.target.value } : prev))
                }
                rows={16}
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  boxSizing: "border-box",
                  resize: "vertical",
                  fontFamily: "Consolas, monospace",
                  fontSize: "13px",
                  lineHeight: 1.55,
                }}
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}>
                Verwendung / Kontext
              </label>
              <textarea
                value={draftEntry.usage}
                onChange={(event) =>
                  setDraftEntry((prev) => (prev ? { ...prev, usage: event.target.value } : prev))
                }
                rows={3}
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  boxSizing: "border-box",
                  resize: "vertical",
                }}
              />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}>
                Platzhalter / Variablen
              </label>
              <input
                value={draftEntry.placeholders.join(", ")}
                onChange={(event) =>
                  setDraftEntry((prev) =>
                    prev
                      ? {
                          ...prev,
                          placeholders: event.target.value
                            .split(",")
                            .map((item) => item.trim())
                            .filter(Boolean),
                        }
                      : prev
                  )
                }
                placeholder="{company}, {contactPerson}, {jobTitle}"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
              <div style={{ fontSize: "12px", color: "#6b7280" }}>
                Letzte Aenderung: {formatDate(selectedEntry.updatedAt)}
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setDraftEntry({ ...selectedEntry })}
                  style={{
                    padding: "10px 14px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    background: "#ffffff",
                    cursor: "pointer",
                  }}
                >
                  Aenderungen verwerfen
                </button>
                <button
                  type="button"
                  onClick={saveEntry}
                  disabled={saving}
                  style={{
                    padding: "10px 14px",
                    border: "none",
                    borderRadius: "8px",
                    background: "#111827",
                    color: "#ffffff",
                    cursor: saving ? "not-allowed" : "pointer",
                    opacity: saving ? 0.7 : 1,
                  }}
                >
                  {saving ? "Speichert..." : "Speichern"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
