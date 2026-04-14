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

type KaltSubTab = "standard" | "advanced";

type HookVariantStats = {
  hookVariantId: string;
  hookText: string;
  sent: number;
  opened: number;
  openRate: number;
  reminderSent: number;
  reminderRate: number;
};

type HookBaseStats = {
  hookBaseId: string;
  hookBaseLabel: string;
  sent: number;
  opened: number;
  openRate: number;
  reminderSent: number;
  reminderRate: number;
  bestVariantId: string;
  bestVariantOpenRate: number;
  variants: HookVariantStats[];
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

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)} %`;
}

type ExampleMailPreview = {
  label: string;
  subject: string;
  greeting: string;
  body: string;
  signature: string;
  note: string;
};

function replacePreviewVars(text: string, values: Record<string, string>) {
  let result = text;
  for (const [key, value] of Object.entries(values)) {
    result = result.replaceAll(key, value);
  }
  return result;
}

function extractFirstBulletByHeading(content: string, heading: string) {
  const lines = content.split(/\r?\n/);
  let inSection = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (!line.startsWith("-") && line.endsWith(":")) {
      inSection = line.slice(0, -1).trim().toLowerCase() === heading.trim().toLowerCase();
      continue;
    }

    if (inSection && line.startsWith("-")) {
      return line.replace(/^-+\s*/, "").trim();
    }
  }

  return "";
}

function extractFooterLines(content: string, heading: string) {
  const lines = content.split(/\r?\n/);
  const result: string[] = [];
  let inSection = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      if (inSection && result.length > 0) break;
      continue;
    }

    if (!line.startsWith("-") && line.endsWith(":")) {
      const normalized = line.slice(0, -1).trim().toLowerCase();
      if (inSection && normalized !== heading.trim().toLowerCase()) break;
      inSection = normalized === heading.trim().toLowerCase();
      continue;
    }

    if (inSection && line.startsWith("-")) {
      const cleaned = line.replace(/^-+\s*/, "").trim();
      if (cleaned.toLowerCase().includes("bild:")) continue;
      result.push(cleaned);
    }
  }

  return result;
}

function buildPreviewEntries(entries: PromptTextEntry[], draftEntry: PromptTextEntry | null) {
  if (!draftEntry) return entries;
  return entries.map((entry) => (entry.id === draftEntry.id ? draftEntry : entry));
}

function buildExampleMailPreview(
  area: PromptTextArea,
  entries: PromptTextEntry[]
): ExampleMailPreview | null {
  const sampleVars = {
    "{company}": "Musterbau GmbH",
    "{contactPerson}": "Martina Schulz",
    "{jobTitle}": "Bauleiter",
  };

  if (area === "streumail") {
    const subjectEntry = entries.find((entry) => entry.id === "bulk-subject-logic");
    const footerEntry = entries.find((entry) => entry.id === "bulk-greeting-footer");
    const subject =
      replacePreviewVars(
        extractFirstBulletByHeading(subjectEntry?.content || "", "Standard") ||
          "Zusaetzliche regionale Sichtbarkeit fuer offene Positionen",
        sampleVars
      ) || "Zusaetzliche regionale Sichtbarkeit fuer offene Positionen";
    const footerLines = extractFooterLines(footerEntry?.content || "", "Signatur / Footer");

    return {
      label: "Beispielmail Streumail",
      subject,
      greeting: "Guten Tag Martina Schulz,",
      body:
        "ich habe gesehen, dass sich offene Positionen bei Musterbau GmbH mit zusaetzlicher regionaler Reichweite sinnvoll ergaenzen lassen.\n\nueber jobs-in-berlin-brandenburg.de werden offene Positionen gezielt in Berlin-Brandenburg sichtbar. Das kann helfen, passende Bewerbungen aus dem direkten Umfeld zu erhalten.\n\nGerne sende ich Ihnen bei Interesse ein unverbindliches Angebot zu.",
      signature: footerLines.join("\n") || "Andre Eichstaedt\nAnzeigenberater\nJobs in Berlin-Brandenburg",
      note: "Basis: aktueller Streumail-Betreff, Anrede-/Footer-Baustein und Standard-Logik.",
    };
  }

  if (area === "kaltakquise") {
    const subjectEntry = entries.find((entry) => entry.id === "coldmail-subject-logic");
    const footerEntry = entries.find((entry) => entry.id === "coldmail-footer-signature");
    const subject =
      replacePreviewVars(
        extractFirstBulletByHeading(subjectEntry?.content || "", "Erstmail mit Jobtitel") ||
          "Zur Position {jobTitle}: mehr passende Bewerber",
        sampleVars
      ) || "Zur Position Bauleiter: mehr passende Bewerber";

    return {
      label: "Beispielmail Kaltakquise",
      subject,
      greeting: "Guten Tag Martina Schulz,",
      body:
        "gerade fuer Positionen wie Bauleiter kann zusaetzliche regionale Sichtbarkeit helfen, mehr passende Bewerber zu erreichen.\n\nueber jobs-in-berlin-brandenburg.de laesst sich die bestehende Reichweite Ihrer Anzeige sinnvoll ergaenzen. Gerne sende ich Ihnen ein unverbindliches Angebot zu.",
      signature:
        footerEntry?.content || "Mit freundlichen Gruessen\n\nAndre Eichstaedt\nAnzeigenberater",
      note: "Basis: aktuelle Kaltakquise-Betrefflogik plus gespeicherter Footer/Signatur.",
    };
  }

  if (area === "erinnerungen") {
    const subjectEntry = entries.find((entry) => entry.id === "crm-reminder-subject");
    const textEntry = entries.find((entry) => entry.id === "crm-reminder-text");
    const footerEntry = entries.find((entry) => entry.id === "reminder-footer-signature");
    const subject =
      replacePreviewVars(
        extractFirstBulletByHeading(subjectEntry?.content || "", "Streumail") ||
          "Kurzes Follow-up zu regionaler Sichtbarkeit fuer {company}",
        sampleVars
      ) || "Kurzes Follow-up zu regionaler Sichtbarkeit fuer Musterbau GmbH";
    const reminderText =
      extractFirstBulletByHeading(textEntry?.content || "", "Streumail Erinnerung standard") ||
      "ich wollte mich noch einmal kurz melden, falls zusaetzliche regionale Sichtbarkeit fuer offene Positionen fuer Sie aktuell interessant sein sollte.";

    return {
      label: "Beispielmail Erinnerung",
      subject,
      greeting: "Guten Tag Martina Schulz,",
      body: `${reminderText}\n\nWenn das fuer Sie interessant ist, sende ich Ihnen gern kurz weitere Infos.`,
      signature:
        footerEntry?.content || "Mit freundlichen Gruessen\n\nAndre Eichstaedt\nAnzeigenberater",
      note: "Basis: aktuelle Reminder-Betrefflogik, Reminder-Text und Erinnerungs-Signatur.",
    };
  }

  return null;
}

export default function PromptsTextPage() {
  const [entries, setEntries] = useState<PromptTextEntry[]>([]);
  const [activeArea, setActiveArea] = useState<PromptTextArea>("kaltakquise");
  const [kaltSubTab, setKaltSubTab] = useState<KaltSubTab>("standard");
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [draftEntry, setDraftEntry] = useState<PromptTextEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [textStats, setTextStats] = useState<HookBaseStats[]>([]);

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

  useEffect(() => {
    async function loadTextStats() {
      try {
        setLoadingStats(true);
        const response = await fetch("/api/crm/text-stats");
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Text-Auswertungen konnten nicht geladen werden.");
          return;
        }

        setTextStats(Array.isArray(data.hooks) ? data.hooks : []);
      } catch {
        setError("Text-Auswertungen konnten nicht geladen werden.");
      } finally {
        setLoadingStats(false);
      }
    }

    if (activeArea === "kaltakquise" && kaltSubTab === "advanced") {
      loadTextStats();
    }
  }, [activeArea, kaltSubTab]);

  const filteredEntries = useMemo(
    () => entries.filter((entry) => entry.area === activeArea),
    [entries, activeArea]
  );

  const visibleEntries = useMemo(() => {
    if (activeArea !== "kaltakquise") return filteredEntries;

    const isAdvanced = (entry: PromptTextEntry) =>
      entry.id === "coldmail-advanced-prompts" || entry.id.startsWith("coldmail-hook-");

    return filteredEntries.filter((entry) =>
      kaltSubTab === "advanced" ? isAdvanced(entry) : !isAdvanced(entry)
    );
  }, [activeArea, filteredEntries, kaltSubTab]);

  const kaltBadgeGroups = useMemo(() => {
    if (activeArea !== "kaltakquise" || kaltSubTab !== "standard") return [];

    return [
      {
        label: "10 Basis-Texte",
        items: filteredEntries.filter((entry) => entry.id.startsWith("coldmail-hook-")),
      },
      {
        label: "Zusatzhinweise",
        items: filteredEntries.filter((entry) => entry.id.startsWith("coldmail-hint-")),
      },
    ].filter((group) => group.items.length > 0);
  }, [activeArea, filteredEntries, kaltSubTab]);

  const statsSummary = useMemo(() => {
    if (textStats.length === 0) {
      return {
        sent: 0,
        opened: 0,
        reminderSent: 0,
        openRate: 0,
        reminderRate: 0,
      };
    }

    const sent = textStats.reduce((sum, item) => sum + item.sent, 0);
    const opened = textStats.reduce((sum, item) => sum + item.opened, 0);
    const reminderSent = textStats.reduce((sum, item) => sum + item.reminderSent, 0);

    return {
      sent,
      opened,
      reminderSent,
      openRate: sent ? opened / sent : 0,
      reminderRate: sent ? reminderSent / sent : 0,
    };
  }, [textStats]);

  const selectedEntry = useMemo(
    () => entries.find((entry) => entry.id === selectedEntryId) || null,
    [entries, selectedEntryId]
  );

  const effectiveEntries = useMemo(
    () => buildPreviewEntries(entries, draftEntry),
    [entries, draftEntry]
  );

  const exampleMailPreview = useMemo(
    () => buildExampleMailPreview(activeArea, effectiveEntries),
    [activeArea, effectiveEntries]
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
              onClick={() => {
                setActiveArea(area.key);
                if (area.key !== "kaltakquise") {
                  setKaltSubTab("standard");
                }
              }}
              style={smallButtonStyle(activeArea === area.key)}
            >
              {area.label}
            </button>
          ))}
        </div>

        {activeArea === "kaltakquise" ? (
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
            <button
              type="button"
              onClick={() => setKaltSubTab("standard")}
              style={smallButtonStyle(kaltSubTab === "standard")}
            >
              Kalt-Emails
            </button>
            <button
              type="button"
              onClick={() => setKaltSubTab("advanced")}
              style={smallButtonStyle(kaltSubTab === "advanced")}
            >
              Erweiterte Prompts & Auswertungen
            </button>
          </div>
        ) : null}

        {error ? <div style={{ color: "#b91c1c", fontWeight: 600 }}>{error}</div> : null}
        {successMessage ? (
          <div style={{ color: "#166534", fontWeight: 600 }}>{successMessage}</div>
        ) : null}

        {kaltBadgeGroups.length > 0 ? (
          <div style={{ display: "grid", gap: "14px" }}>
            {kaltBadgeGroups.map((group) => (
              <div
                key={group.label}
                style={{
                  border: "1px solid #d1d5db",
                  borderRadius: "16px",
                  background: "#ffffff",
                  padding: "16px",
                }}
              >
                <div style={{ fontSize: "16px", fontWeight: 700, marginBottom: "12px" }}>
                  {group.label}
                </div>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  {group.items.map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => openEntry(entry)}
                      style={{
                        padding: "8px 12px",
                        borderRadius: "999px",
                        border: "1px solid #cbd5e1",
                        background: "#ffffff",
                        color: "#111827",
                        cursor: "pointer",
                        fontSize: "13px",
                        fontWeight: 600,
                      }}
                    >
                      {entry.title.replace(/^Basis-Text:\s*/i, "").replace(/^Hinweis-Prompt:\s*/i, "")}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {activeArea === "kaltakquise" && kaltSubTab === "advanced" ? (
          <div
            style={{
              border: "1px solid #d1d5db",
              borderRadius: "16px",
              background: "#ffffff",
              padding: "22px",
            }}
          >
            <div style={{ fontSize: "20px", fontWeight: 700, marginBottom: "6px" }}>
              Erweiterte Prompts & Auswertungen
            </div>
            <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "18px" }}>
              Hier laufen die alte Hook-Logik mit den 10 Basis-Texten, ihre Mutationen und die
              aktuelle Oeffnungs- beziehungsweise Reminder-Auswertung zusammen.
            </div>

            {loadingStats ? (
              <div style={{ color: "#6b7280" }}>Auswertungen werden geladen...</div>
            ) : textStats.length === 0 ? (
              <div style={{ color: "#6b7280" }}>Noch keine Textdaten fuer die Auswertung vorhanden.</div>
            ) : (
              <div style={{ display: "grid", gap: "20px" }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                    gap: "12px",
                  }}
                >
                  <div style={{ border: "1px solid #e5e7eb", borderRadius: "12px", padding: "14px" }}>
                    <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "6px" }}>
                      Gesendet
                    </div>
                    <div style={{ fontSize: "22px", fontWeight: 700 }}>{statsSummary.sent}</div>
                  </div>
                  <div style={{ border: "1px solid #e5e7eb", borderRadius: "12px", padding: "14px" }}>
                    <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "6px" }}>
                      Geoeffnet
                    </div>
                    <div style={{ fontSize: "22px", fontWeight: 700 }}>{statsSummary.opened}</div>
                  </div>
                  <div style={{ border: "1px solid #e5e7eb", borderRadius: "12px", padding: "14px" }}>
                    <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "6px" }}>
                      Oeffnungsrate
                    </div>
                    <div style={{ fontSize: "22px", fontWeight: 700 }}>
                      {formatPercent(statsSummary.openRate)}
                    </div>
                  </div>
                  <div style={{ border: "1px solid #e5e7eb", borderRadius: "12px", padding: "14px" }}>
                    <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "6px" }}>
                      Reminder-Quote
                    </div>
                    <div style={{ fontSize: "22px", fontWeight: 700 }}>
                      {formatPercent(statsSummary.reminderRate)}
                    </div>
                  </div>
                </div>

                <div style={{ display: "grid", gap: "14px" }}>
                  {textStats.map((hook) => (
                    <div
                      key={hook.hookBaseId}
                      style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: "14px",
                        padding: "16px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          gap: "16px",
                          flexWrap: "wrap",
                          marginBottom: "12px",
                        }}
                      >
                        <div>
                          <div style={{ fontSize: "17px", fontWeight: 700, marginBottom: "4px" }}>
                            {hook.hookBaseLabel}
                          </div>
                          <div style={{ fontSize: "13px", color: "#6b7280" }}>
                            {hook.sent} gesendet, {hook.opened} geoeffnet, bester Variantencode:{" "}
                            {hook.bestVariantId}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const matchingEntry = entries.find(
                              (entry) => entry.id === `coldmail-hook-${hook.hookBaseId}`
                            );
                            if (matchingEntry) openEntry(matchingEntry);
                          }}
                          style={{
                            padding: "8px 12px",
                            borderRadius: "999px",
                            border: "1px solid #cbd5e1",
                            background: "#ffffff",
                            cursor: "pointer",
                            fontSize: "13px",
                            fontWeight: 600,
                          }}
                        >
                          Basis-Text oeffnen
                        </button>
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                          gap: "10px",
                          marginBottom: "12px",
                        }}
                      >
                        <div style={{ background: "#f9fafb", borderRadius: "10px", padding: "10px 12px" }}>
                          <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "4px" }}>
                            Oeffnungsrate
                          </div>
                          <div style={{ fontSize: "16px", fontWeight: 700 }}>
                            {formatPercent(hook.openRate)}
                          </div>
                        </div>
                        <div style={{ background: "#f9fafb", borderRadius: "10px", padding: "10px 12px" }}>
                          <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "4px" }}>
                            Reminder-Quote
                          </div>
                          <div style={{ fontSize: "16px", fontWeight: 700 }}>
                            {formatPercent(hook.reminderRate)}
                          </div>
                        </div>
                        <div style={{ background: "#f9fafb", borderRadius: "10px", padding: "10px 12px" }}>
                          <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "4px" }}>
                            Varianten
                          </div>
                          <div style={{ fontSize: "16px", fontWeight: 700 }}>{hook.variants.length}</div>
                        </div>
                      </div>

                      <div style={{ display: "grid", gap: "10px" }}>
                        {hook.variants.slice(0, 3).map((variant) => (
                          <div
                            key={variant.hookVariantId}
                            style={{
                              border: "1px solid #f3f4f6",
                              borderRadius: "10px",
                              padding: "12px",
                              background: "#fcfcfd",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                gap: "12px",
                                flexWrap: "wrap",
                                marginBottom: "6px",
                              }}
                            >
                              <div style={{ fontWeight: 700 }}>{variant.hookVariantId}</div>
                              <div style={{ fontSize: "13px", color: "#6b7280" }}>
                                {variant.sent} gesendet, {variant.opened} geoeffnet,{" "}
                                {formatPercent(variant.openRate)}
                              </div>
                            </div>
                            <div style={{ fontSize: "13px", color: "#374151", lineHeight: 1.5 }}>
                              {variant.hookText}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}

        {loading ? (
          <div style={{ color: "#6b7280" }}>Prompts & Texte werden geladen...</div>
        ) : visibleEntries.length === 0 ? (
          <div style={{ color: "#6b7280" }}>Fuer diesen Bereich gibt es noch keine Eintraege.</div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "16px",
            }}
          >
            {visibleEntries.map((entry) => (
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

        {exampleMailPreview ? (
          <div
            style={{
              border: "1px solid #d1d5db",
              borderRadius: "16px",
              background: "#ffffff",
              padding: "22px",
            }}
          >
            <div style={{ fontSize: "20px", fontWeight: 700, marginBottom: "6px" }}>
              {exampleMailPreview.label}
            </div>
            <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "18px" }}>
              {exampleMailPreview.note}
            </div>

            <div style={{ display: "grid", gap: "14px" }}>
              <div>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#6b7280", marginBottom: "6px" }}>
                  Betreff
                </div>
                <div style={{ fontSize: "15px", fontWeight: 600 }}>{exampleMailPreview.subject}</div>
              </div>

              <div>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#6b7280", marginBottom: "6px" }}>
                  Anrede
                </div>
                <div style={{ fontSize: "15px" }}>{exampleMailPreview.greeting}</div>
              </div>

              <div>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#6b7280", marginBottom: "6px" }}>
                  Text
                </div>
                <div
                  style={{
                    whiteSpace: "pre-wrap",
                    fontSize: "15px",
                    lineHeight: 1.7,
                    color: "#111827",
                  }}
                >
                  {exampleMailPreview.body}
                </div>
              </div>

              <div>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#6b7280", marginBottom: "6px" }}>
                  Signatur
                </div>
                <div
                  style={{
                    whiteSpace: "pre-wrap",
                    fontSize: "14px",
                    lineHeight: 1.6,
                    color: "#374151",
                  }}
                >
                  {exampleMailPreview.signature}
                </div>
              </div>
            </div>
          </div>
        ) : null}
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
