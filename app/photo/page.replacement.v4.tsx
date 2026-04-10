"use client";

import { useEffect, useMemo, useState } from "react";
import BulkLeadsTableReplacementV4, {
  type BulkLead,
  type BulkLeadEmailOption,
} from "./BulkLeadsTable.replacement.v4";

type MainView = "mails" | "bulk" | "reminders" | "analytics";

type MailRecord = {
  id: string;
  subject: string;
  jobTitle?: string;
  company?: string;
  normalizedCompany?: string;
  contactPerson: string;
  recipientEmail: string;
  recipientLabel?: string;
  domain: string;
  text: string;
  status: "sent" | "test" | "failed" | "draft";
  createdAt: string;
  lastEvent?: string;
  reminderLabel?: string;
  reminded?: boolean;
  reminderSentAt?: string;
  reminderSubject?: string;
};

type MailDetail = {
  id: string;
  to: string[];
  from: string;
  subject: string;
  createdAt: string;
  html: string;
  text: string;
  lastEvent: string;
  cc: string[];
  bcc: string[];
  replyTo: string[];
};

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

type BulkTextBlock = {
  id: string;
  title: string;
  text: string;
};

const EMPTY_BULK_LEADS: BulkLead[] = [];
const BULK_TEXT_BLOCKS_KEY = "bulkTextBlocksV1";

function getDomain(email: string) {
  return email.split("@")[1]?.toLowerCase().trim() || "";
}

function normalizeCompany(company: string) {
  return company
    .toLowerCase()
    .replace(/\b(gmbh|mbh|ag|ug|kg|e\.v\.|ev|stadt|gemeinde)\b/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

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

function isWithinLast14Days(dateString: string) {
  if (!dateString) return false;
  const date = new Date(dateString).getTime();
  if (Number.isNaN(date)) return false;
  const diff = Date.now() - date;
  return diff <= 14 * 24 * 60 * 60 * 1000;
}

function displayMailTitle(mail: Pick<MailRecord, "jobTitle" | "subject">) {
  return mail.jobTitle?.trim() || mail.subject || "Ohne Betreff";
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)} %`;
}

function primaryButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: "10px 16px",
    border: "none",
    borderRadius: "8px",
    background: "#111827",
    color: "#ffffff",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: "15px",
    opacity: disabled ? 0.7 : 1,
  };
}

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

function topMenuButtonStyle(active: boolean): React.CSSProperties {
  return {
    padding: "10px 14px",
    borderRadius: "999px",
    border: "1px solid #cbd5e1",
    background: active ? "#111827" : "#ffffff",
    color: active ? "#ffffff" : "#111827",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 600,
  };
}

function StatBar({ value, label }: { value: number; label: string }) {
  const width = Math.max(0, Math.min(100, value * 100));
  return (
    <div style={{ marginBottom: "12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", marginBottom: "6px", fontSize: "13px" }}>
        <span>{label}</span>
        <span style={{ fontWeight: 600 }}>{formatPercent(value)}</span>
      </div>
      <div style={{ height: "10px", background: "#e5e7eb", borderRadius: "999px", overflow: "hidden" }}>
        <div style={{ width: `${width}%`, height: "100%", background: "#111827" }} />
      </div>
    </div>
  );
}

function StatCard({ label, value, subValue }: { label: string; value: string; subValue?: string }) {
  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: "12px", padding: "14px", background: "#ffffff" }}>
      <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "6px" }}>{label}</div>
      <div style={{ fontSize: "20px", fontWeight: 700, lineHeight: 1.2 }}>{value}</div>
      {subValue ? <div style={{ marginTop: "6px", fontSize: "12px", color: "#6b7280" }}>{subValue}</div> : null}
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <label style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}>{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", background: "#ffffff", fontSize: "15px", boxSizing: "border-box" }} />
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: "12px" }}>
      <div style={{ color: "#6b7280" }}>{label}</div>
      <div style={{ wordBreak: "break-word" }}>{value}</div>
    </div>
  );
}

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

const selectStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #cbd5e1",
  borderRadius: "8px",
  background: "#ffffff",
  fontSize: "14px",
  boxSizing: "border-box",
};

export default function PhotoToMailPageReplacementV4() {
  const [mainView, setMainView] = useState<MainView>("bulk");
  const [isMobile, setIsMobile] = useState(false);
  const [loadingCrm, setLoadingCrm] = useState(false);
  const [mailHistory, setMailHistory] = useState<MailRecord[]>([]);
  const [selectedMail, setSelectedMail] = useState<MailRecord | null>(null);
  const [selectedMailDetail, setSelectedMailDetail] = useState<MailDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingTextStats, setLoadingTextStats] = useState(false);
  const [textStats, setTextStats] = useState<HookBaseStats[]>([]);
  const [selectedAnalyticsHookId, setSelectedAnalyticsHookId] = useState("");
  const [bulkLocation, setBulkLocation] = useState("");
  const [bulkFocus, setBulkFocus] = useState("");
  const [bulkRadius, setBulkRadius] = useState("30");
  const [bulkCount, setBulkCount] = useState("20");
  const [bulkLeads, setBulkLeads] = useState<BulkLead[]>(EMPTY_BULK_LEADS);
  const [findingBulkLeads, setFindingBulkLeads] = useState(false);
  const [bulkTestMode, setBulkTestMode] = useState(true);
  const [bulkShortMode, setBulkShortMode] = useState(false);
  const [bulkTextBlocks, setBulkTextBlocks] = useState<BulkTextBlock[]>([]);
  const [activeBulkTextBlockIds, setActiveBulkTextBlockIds] = useState<string[]>([]);
  const [editingBulkTextBlock, setEditingBulkTextBlock] = useState<BulkTextBlock | null>(null);
  const [bulkEditorOpen, setBulkEditorOpen] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < 980);
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(BULK_TEXT_BLOCKS_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return;
      const normalized = parsed.map((item) => ({ id: String(item?.id || crypto.randomUUID()), title: String(item?.title || "").trim(), text: String(item?.text || "").trim() })).filter((item) => item.title || item.text);
      setBulkTextBlocks(normalized);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(BULK_TEXT_BLOCKS_KEY, JSON.stringify(bulkTextBlocks));
    } catch {}
  }, [bulkTextBlocks]);

  const selectedHookStats = useMemo(() => textStats.find((item) => item.hookBaseId === selectedAnalyticsHookId) || null, [textStats, selectedAnalyticsHookId]);
  const activeBulkTextBlocks = useMemo(() => bulkTextBlocks.filter((block) => activeBulkTextBlockIds.includes(block.id)), [bulkTextBlocks, activeBulkTextBlockIds]);

  async function loadCrm() {
    try {
      setLoadingCrm(true);
      const response = await fetch(`/api/crm/emails?mode=all`);
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "CRM konnte nicht geladen werden.");
        return;
      }
      setMailHistory(Array.isArray(data.emails) ? data.emails : []);
    } catch {
      setError("CRM konnte nicht geladen werden.");
    } finally {
      setLoadingCrm(false);
    }
  }

  async function loadTextStats() {
    try {
      setLoadingTextStats(true);
      const response = await fetch("/api/crm/text-stats");
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Text-Auswertungen konnten nicht geladen werden.");
        return;
      }
      const hooks = Array.isArray(data.hooks) ? data.hooks : [];
      setTextStats(hooks);
      if (hooks.length > 0 && !selectedAnalyticsHookId) setSelectedAnalyticsHookId(hooks[0].hookBaseId);
    } catch {
      setError("Text-Auswertungen konnten nicht geladen werden.");
    } finally {
      setLoadingTextStats(false);
    }
  }

  useEffect(() => { loadCrm(); }, []);
  useEffect(() => { if (mainView === "analytics") loadTextStats(); }, [mainView]);

  function openNewBulkTextBlockEditor() {
    setEditingBulkTextBlock({ id: crypto.randomUUID(), title: "", text: "" });
    setBulkEditorOpen(true);
  }

  function openBulkTextBlockEditor(block: BulkTextBlock) {
    setEditingBulkTextBlock({ ...block });
    setBulkEditorOpen(true);
  }

  function saveBulkTextBlock() {
    if (!editingBulkTextBlock) return;
    const title = editingBulkTextBlock.title.trim();
    const text = editingBulkTextBlock.text.trim();
    if (!title || !text) {
      setError("Bitte Titel und Text für den Baustein ausfüllen.");
      return;
    }
    setBulkTextBlocks((prev) => {
      const exists = prev.some((item) => item.id === editingBulkTextBlock.id);
      if (exists) return prev.map((item) => item.id === editingBulkTextBlock.id ? { ...editingBulkTextBlock, title, text } : item);
      return [...prev, { ...editingBulkTextBlock, title, text }];
    });
    setActiveBulkTextBlockIds((prev) => prev.includes(editingBulkTextBlock.id) ? prev : [...prev, editingBulkTextBlock.id]);
    setBulkEditorOpen(false);
    setEditingBulkTextBlock(null);
  }

  function deleteBulkTextBlock(id: string) {
    setBulkTextBlocks((prev) => prev.filter((item) => item.id !== id));
    setActiveBulkTextBlockIds((prev) => prev.filter((item) => item !== id));
    setBulkEditorOpen(false);
    setEditingBulkTextBlock(null);
  }

  function toggleBulkTextBlock(id: string) {
    setActiveBulkTextBlockIds((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);
  }

  async function handleFindBulkLeads() {
    setError("");
    setSuccessMessage("");
    const location = bulkLocation.trim();
    const count = Number(bulkCount);
    if (!location) {
      setError("Bitte Ort oder PLZ für Streumail eingeben.");
      return;
    }
    try {
      setFindingBulkLeads(true);
      const response = await fetch("/api/bulk-find-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location, focus: bulkFocus.trim(), count, radius: bulkRadius }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Die Firmenliste konnte nicht geladen werden.");
        return;
      }
      setBulkLeads(Array.isArray(data.leads) ? data.leads : []);
      setSuccessMessage(`${Array.isArray(data.leads) ? data.leads.length : count} Unternehmen für ${location} geladen.`);
    } catch {
      setError("Die Firmenliste konnte nicht geladen werden.");
    } finally {
      setFindingBulkLeads(false);
    }
  }

  function updateBulkLead(id: string, patch: Partial<BulkLead>) {
    setBulkLeads((prev) => prev.map((lead) => lead.id === id ? { ...lead, ...patch } : lead));
  }

  function setAllBulkLeadsSelected(selected: boolean) {
    setBulkLeads((prev) => prev.map((lead) => ({ ...lead, selected })));
  }

  function chooseLeadEmail(id: string, value: string) {
    const lead = bulkLeads.find((item) => item.id === id);
    const option = lead?.emailOptions?.find((item) => item.value === value);
    updateBulkLead(id, { email: value, emailNeedsReview: option?.needsReview || false });
  }

  function chooseLeadContactPerson(id: string, value: string) {
    updateBulkLead(id, { contactPerson: value });
  }

  async function handleAnalyzeBulkLead(id: string) {
    const lead = bulkLeads.find((item) => item.id === id);
    if (!lead) return;
    updateBulkLead(id, { analysisStatus: "loading" });
    try {
      const response = await fetch("/api/bulk-analyze-company", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ company: lead.company, website: lead.website, city: lead.city }) });
      const data = await response.json();
      if (!response.ok) {
        updateBulkLead(id, { analysisStatus: "error", analysisSummary: data.error || "Analyse fehlgeschlagen." });
        return;
      }
      updateBulkLead(id, { analysisStatus: data.analysisStatus || "done", analysisStars: Number(data.analysisStars || 0) as 0 | 1 | 2 | 3, analysisSummary: String(data.analysisSummary || "").trim(), foundJobTitles: Array.isArray(data.foundJobTitles) ? data.foundJobTitles : [], foundCareerUrls: Array.isArray(data.foundCareerUrls) ? data.foundCareerUrls : [] });
    } catch {
      updateBulkLead(id, { analysisStatus: "error", analysisSummary: "Analyse fehlgeschlagen." });
    }
  }

  async function handleCollectBulkData(id: string) {
    const lead = bulkLeads.find((item) => item.id === id);
    if (!lead) return;
    updateBulkLead(id, { contactStatus: "loading" });
    try {
      const response = await fetch("/api/bulk-collect-contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ company: lead.company, website: lead.website }) });
      const data = await response.json();
      if (!response.ok) {
        updateBulkLead(id, { contactStatus: "error" });
        return;
      }
      updateBulkLead(id, {
        contactStatus: data.contactStatus || "done",
        email: String(data.email || "").trim(),
        emailOptions: Array.isArray(data.emailOptions) ? data.emailOptions as BulkLeadEmailOption[] : [],
        emailNeedsReview: Boolean(data.emailNeedsReview),
        contactPerson: String(data.contactPerson || "").trim(),
        contactPersonOptions: Array.isArray(data.contactPersonOptions) ? data.contactPersonOptions : [],
        industry: String(data.industry || "").trim(),
      });
    } catch {
      updateBulkLead(id, { contactStatus: "error" });
    }
  }

  async function handleAssessBulkQuality(id: string) {
    const lead = bulkLeads.find((item) => item.id === id);
    if (!lead) return;
    updateBulkLead(id, { qualityStatus: "loading" });
    await new Promise((resolve) => setTimeout(resolve, 100));
    const domain = getDomain(lead.email);
    const normalizedLeadCompany = normalizeCompany(lead.company);
    const existing = mailHistory.find((mail) => {
      const sameEmail = lead.email && mail.recipientEmail.toLowerCase() === lead.email.toLowerCase();
      const sameDomain = domain && mail.domain === domain;
      const sameCompany = normalizedLeadCompany && mail.company && normalizeCompany(mail.company) === normalizedLeadCompany;
      return (sameEmail || sameDomain || sameCompany) && isWithinLast14Days(mail.createdAt);
    });
    let qualityStars: 0 | 1 | 2 | 3 = 1;
    let qualitySummary = "Es gibt erste Hinweise, aber noch begrenzte Daten.";
    if (lead.analysisStars >= 2 && lead.email) {
      qualityStars = 2;
      qualitySummary = "Es gibt genug Daten für eine brauchbare Vertriebsmail.";
    }
    if (lead.analysisStars >= 3 && lead.email && lead.industry && lead.contactPerson) {
      qualityStars = 3;
      qualitySummary = "Guter Lead: klare Recruiting-Hinweise und belastbare Kontaktdaten.";
    }
    if (lead.emailNeedsReview) qualitySummary += " Email bitte prüfen.";
    if (existing) qualitySummary += ` Bereits in den letzten 14 Tagen kontaktiert (${formatDate(existing.createdAt)}).`;
    updateBulkLead(id, { qualityStatus: "done", qualityStars, qualitySummary, alreadyContacted: Boolean(existing), lastContactAt: existing?.createdAt || "" });
  }

  async function handleSendBulkLead(id: string) {
    const lead = bulkLeads.find((item) => item.id === id);
    if (!lead || !lead.email) {
      setError("Für dieses Unternehmen wurde noch keine E-Mail-Adresse gefunden.");
      return;
    }
    updateBulkLead(id, { sendStatus: "loading" });
    try {
      const generateResponse = await fetch("/api/generate-bulk-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company: lead.company, industry: lead.industry, analysisSummary: lead.analysisSummary, shortMode: bulkShortMode, textBlocks: activeBulkTextBlocks }),
      });
      const generated = await generateResponse.json();
      if (!generateResponse.ok) {
        updateBulkLead(id, { sendStatus: "error" });
        setError(generated.error || "Bulk-Mail konnte nicht generiert werden.");
        return;
      }
      const sendResponse = await fetch("/api/send-bulk-mail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: lead.email,
          subject: generated.subject,
          text: generated.text,
          testMode: bulkTestMode,
          sendCopy: true,
          company: lead.company,
          contactPerson: lead.contactPerson,
          hookText: activeBulkTextBlocks.map((block) => block.title).join(", ") || generated.subject,
          textBlockTitles: activeBulkTextBlocks.map((block) => block.title),
          shortMode: bulkShortMode,
        }),
      });
      const sendData = await sendResponse.json();
      if (!sendResponse.ok) {
        updateBulkLead(id, { sendStatus: "error" });
        setError(sendData.error || "Streumail konnte nicht gesendet werden.");
        return;
      }
      updateBulkLead(id, { sendStatus: "sent" });
      setSuccessMessage(bulkTestMode ? `Streumail-Test für "${lead.company}" wurde an den Test-Empfänger gesendet.` : `Streumail für "${lead.company}" wurde gesendet.`);
      await loadCrm();
    } catch {
      updateBulkLead(id, { sendStatus: "error" });
      setError("Streumail konnte nicht gesendet werden.");
    }
  }

  async function handleOpenMailDetail(mail: MailRecord) {
    setSelectedMail(mail);
    setSelectedMailDetail(null);
    try {
      setLoadingDetail(true);
      const response = await fetch(`/api/crm/email/${mail.id}`);
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Details konnten nicht geladen werden.");
        return;
      }
      setSelectedMailDetail(data);
    } catch {
      setError("Details konnten nicht geladen werden.");
    } finally {
      setLoadingDetail(false);
    }
  }

  return (
    <>
      <div style={{ marginBottom: "18px", display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
        <button type="button" onClick={() => setMainView("bulk")} style={topMenuButtonStyle(mainView === "bulk")}>Streumail</button>
        <button type="button" onClick={() => setMainView("analytics")} style={topMenuButtonStyle(mainView === "analytics")}>Texte & Auswertungen</button>
      </div>

      <div style={{ display: "flex", gap: "24px", alignItems: "flex-start", flexDirection: isMobile ? "column" : "row", width: "100%" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {error ? <div style={{ marginBottom: "18px", color: "#b91c1c", fontWeight: 600 }}>{error}</div> : null}
          {successMessage ? <div style={{ marginBottom: "18px", color: "#166534", fontWeight: 600 }}>{successMessage}</div> : null}

          {mainView === "bulk" && (
            <div style={{ background: "#ffffff", border: "1px solid #d1d5db", borderRadius: "14px", padding: "20px", boxSizing: "border-box" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", alignItems: "flex-start", flexWrap: "wrap", marginBottom: "18px" }}>
                <div style={{ fontSize: "18px", fontWeight: 700 }}>Streumail</div>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center", justifyContent: "flex-end" }}>
                  {bulkTextBlocks.map((block) => {
                    const active = activeBulkTextBlockIds.includes(block.id);
                    return (
                      <div key={block.id} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 10px", border: "1px solid #cbd5e1", borderRadius: "999px", background: active ? "#111827" : "#ffffff", color: active ? "#ffffff" : "#111827" }}>
                        <button type="button" onClick={() => toggleBulkTextBlock(block.id)} style={{ border: "none", background: "transparent", color: "inherit", cursor: "pointer", padding: 0, fontSize: "12px", fontWeight: 600 }}>{block.title}</button>
                        <button type="button" onClick={() => openBulkTextBlockEditor(block)} style={{ border: "none", background: "transparent", color: "inherit", cursor: "pointer", padding: 0, fontSize: "12px" }}>✎</button>
                      </div>
                    );
                  })}
                  <button type="button" onClick={openNewBulkTextBlockEditor} style={smallButtonStyle(false)}>+ Baustein</button>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(180px, 1.1fr) minmax(180px, 1fr) 140px 140px auto", gap: "12px", alignItems: "end", marginBottom: "18px" }}>
                <Field label="PLZ oder Ort" value={bulkLocation} onChange={setBulkLocation} placeholder="z. B. Potsdam oder 14467" />
                <Field label="Besonderheiten / Fokus" value={bulkFocus} onChange={setBulkFocus} placeholder="z. B. Arzt, Pflege, Handwerk, kleinere Unternehmen" />
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}>Radius</label>
                  <select value={bulkRadius} onChange={(e) => setBulkRadius(e.target.value)} style={selectStyle}><option value="15">15 km</option><option value="30">30 km</option><option value="50">50 km</option></select>
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}>Kontakte</label>
                  <select value={bulkCount} onChange={(e) => setBulkCount(e.target.value)} style={selectStyle}><option value="10">10</option><option value="20">20</option><option value="30">30</option></select>
                </div>
                <button type="button" onClick={handleFindBulkLeads} disabled={findingBulkLeads} style={primaryButtonStyle(findingBulkLeads)}>{findingBulkLeads ? "Wird gesucht..." : "Liste finden"}</button>
              </div>

              <div style={{ display: "flex", gap: "18px", flexWrap: "wrap", alignItems: "center", marginBottom: "18px" }}>
                <label style={{ fontSize: "14px", cursor: "pointer" }}><input type="checkbox" checked={bulkTestMode} onChange={(e) => setBulkTestMode(e.target.checked)} style={{ marginRight: "6px" }} />Testmodus</label>
                <label style={{ fontSize: "14px", cursor: "pointer" }}><input type="checkbox" checked={bulkShortMode} onChange={(e) => setBulkShortMode(e.target.checked)} style={{ marginRight: "6px" }} />Kurze Mail</label>
                <div style={{ fontSize: "13px", color: "#6b7280" }}>{bulkTestMode ? "Bulk-Versand geht nur an TEST_RECIPIENT_EMAIL." : "Produktivversand an gelistete Empfänger aktiv."}</div>
              </div>

              {bulkLeads.length === 0 ? <div style={{ fontSize: "14px", color: "#6b7280" }}>Noch keine Firmenliste geladen.</div> : <BulkLeadsTableReplacementV4 leads={bulkLeads} onToggleSelected={(id, selected) => updateBulkLead(id, { selected })} onSetAllSelected={setAllBulkLeadsSelected} onAnalyzeOne={handleAnalyzeBulkLead} onCollectOne={handleCollectBulkData} onQualityOne={handleAssessBulkQuality} onSendOne={handleSendBulkLead} onChooseEmail={chooseLeadEmail} onChooseContactPerson={chooseLeadContactPerson} />}
            </div>
          )}

          {mainView === "analytics" && (
            <div style={{ background: "#ffffff", border: "1px solid #d1d5db", borderRadius: "14px", padding: "20px", boxSizing: "border-box" }}>
              <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "18px" }}>Texte & Auswertungen</div>
              {loadingTextStats ? <div style={{ fontSize: "14px", color: "#6b7280" }}>Auswertungen werden geladen...</div> : textStats.length === 0 ? <div style={{ fontSize: "14px", color: "#6b7280" }}>Noch keine Textdaten vorhanden.</div> : <>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "20px" }}>{textStats.map((hook) => {
                  const active = selectedAnalyticsHookId === hook.hookBaseId;
                  return <button key={hook.hookBaseId} type="button" onClick={() => setSelectedAnalyticsHookId(hook.hookBaseId)} style={{ padding: "10px 14px", borderRadius: "999px", border: "1px solid #cbd5e1", background: active ? "#111827" : "#ffffff", color: active ? "#ffffff" : "#111827", cursor: "pointer", fontSize: "14px", fontWeight: 600 }}>{hook.hookBaseLabel}</button>;
                })}</div>
                {selectedHookStats && <>
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(5, minmax(0, 1fr))", gap: "12px", marginBottom: "20px" }}>
                    <StatCard label="Gesendet" value={String(selectedHookStats.sent)} />
                    <StatCard label="Geöffnet" value={String(selectedHookStats.opened)} />
                    <StatCard label="Öffnungsrate" value={formatPercent(selectedHookStats.openRate)} />
                    <StatCard label="Reminder-Quote" value={formatPercent(selectedHookStats.reminderRate)} />
                    <StatCard label="Beste Variante" value={selectedHookStats.bestVariantId || "-"} subValue={formatPercent(selectedHookStats.bestVariantOpenRate)} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.1fr 1fr", gap: "20px", marginBottom: "24px" }}>
                    <div style={{ border: "1px solid #e5e7eb", borderRadius: "12px", padding: "16px" }}>
                      <div style={{ fontWeight: 700, marginBottom: "14px" }}>Kennzahlen</div>
                      <StatBar label="Öffnungsrate" value={selectedHookStats.openRate} />
                      <StatBar label="Reminder-Quote" value={selectedHookStats.reminderRate} />
                      <StatBar label="Beste Variantenrate" value={selectedHookStats.bestVariantOpenRate} />
                    </div>
                    <div style={{ border: "1px solid #e5e7eb", borderRadius: "12px", padding: "16px" }}>
                      <div style={{ fontWeight: 700, marginBottom: "10px" }}>Hook-Überblick</div>
                      <div style={{ fontSize: "14px", color: "#374151", lineHeight: 1.5 }}>
                        <div style={{ marginBottom: "10px" }}>Basehook: <strong>{selectedHookStats.hookBaseLabel}</strong></div>
                        <div style={{ marginBottom: "10px" }}>Varianten: <strong>{selectedHookStats.variants.length}</strong></div>
                        <div>Bestperformer: <strong>{selectedHookStats.bestVariantId}</strong></div>
                      </div>
                    </div>
                  </div>
                  <div style={{ border: "1px solid #e5e7eb", borderRadius: "12px", overflow: "hidden" }}>
                    <div style={{ padding: "14px 16px", borderBottom: "1px solid #e5e7eb", fontWeight: 700 }}>Varianten</div>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                        <thead><tr style={{ background: "#f9fafb", textAlign: "left" }}><th style={tableHeadStyle}>Variante</th><th style={tableHeadStyle}>Gesendet</th><th style={tableHeadStyle}>Geöffnet</th><th style={tableHeadStyle}>Öffnungsrate</th><th style={tableHeadStyle}>Reminder-Quote</th></tr></thead>
                        <tbody>{selectedHookStats.variants.map((variant) => <tr key={variant.hookVariantId}><td style={tableCellStyle}><div style={{ fontWeight: 600, marginBottom: "4px" }}>{variant.hookVariantId}</div><div style={{ fontSize: "12px", color: "#6b7280", lineHeight: 1.4 }}>{variant.hookText}</div></td><td style={tableCellStyle}>{variant.sent}</td><td style={tableCellStyle}>{variant.opened}</td><td style={tableCellStyle}>{formatPercent(variant.openRate)}</td><td style={tableCellStyle}>{formatPercent(variant.reminderRate)}</td></tr>)}</tbody>
                      </table>
                    </div>
                  </div>
                </>}
              </>}
            </div>
          )}
        </div>

        <div style={{ width: isMobile ? "100%" : "340px", minWidth: isMobile ? "100%" : "340px", background: "#ffffff", border: "1px solid #d1d5db", borderRadius: "14px", padding: "16px", boxSizing: "border-box", position: isMobile ? "static" : "sticky", top: "20px" }}>
          <div style={{ fontWeight: 700, fontSize: "16px", marginBottom: "12px" }}>CRM</div>
          {loadingCrm ? <div style={{ fontSize: "13px", color: "#6b7280" }}>CRM wird geladen...</div> : <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: isMobile ? "none" : "70vh", overflowY: "auto", paddingRight: "2px" }}>
            {mailHistory.length === 0 ? <div style={{ fontSize: "13px", color: "#6b7280" }}>Noch keine passenden Einträge vorhanden.</div> : mailHistory.map((mail, index) => <button key={mail.id} type="button" onClick={() => handleOpenMailDetail(mail)} style={{ textAlign: "left", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "10px", background: "#ffffff", cursor: "pointer" }}>
              <div style={{ fontWeight: 600, fontSize: "13px", marginBottom: "4px", lineHeight: 1.3 }}>Streumail {index + 1}</div>
              <div style={{ fontSize: "12px", color: "#374151", marginBottom: "4px" }}>{formatDate(mail.createdAt)}</div>
              <div style={{ fontSize: "11px", color: "#6b7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{mail.subject || mail.jobTitle || "Baustein"}</div>
            </button>)}
          </div>}
        </div>
      </div>

      {bulkEditorOpen && editingBulkTextBlock ? <div style={{ position: "fixed", inset: 0, background: "rgba(17, 24, 39, 0.25)", zIndex: 55, padding: "24px" }} onClick={() => setBulkEditorOpen(false)}>
        <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: "520px", margin: "60px auto", background: "#ffffff", borderRadius: "14px", padding: "20px", boxSizing: "border-box", border: "1px solid #e5e7eb" }}>
          <div style={{ fontSize: "16px", fontWeight: 700, marginBottom: "14px" }}>Textbaustein bearbeiten</div>
          <Field label="Badge-Titel" value={editingBulkTextBlock.title} onChange={(value) => setEditingBulkTextBlock((prev) => prev ? { ...prev, title: value } : prev)} placeholder="z. B. Aktion XY" />
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}>Textbaustein</label>
            <textarea value={editingBulkTextBlock.text} onChange={(e) => setEditingBulkTextBlock((prev) => prev ? { ...prev, text: e.target.value } : prev)} rows={6} style={{ width: "100%", padding: "12px", border: "1px solid #cbd5e1", borderRadius: "8px", background: "#ffffff", fontSize: "14px", boxSizing: "border-box", resize: "vertical", lineHeight: 1.5 }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center" }}>
            <div>{bulkTextBlocks.some((item) => item.id === editingBulkTextBlock.id) ? <button type="button" onClick={() => deleteBulkTextBlock(editingBulkTextBlock.id)} style={{ ...smallButtonStyle(false), borderColor: "#fca5a5", color: "#b91c1c" }}>Löschen</button> : null}</div>
            <div style={{ display: "flex", gap: "10px" }}><button type="button" onClick={() => setBulkEditorOpen(false)} style={smallButtonStyle(false)}>Abbrechen</button><button type="button" onClick={saveBulkTextBlock} style={primaryButtonStyle(false)}>Speichern</button></div>
          </div>
        </div>
      </div> : null}

      {selectedMail ? <div onClick={() => { setSelectedMail(null); setSelectedMailDetail(null); }} style={{ position: "fixed", inset: 0, background: "rgba(17, 24, 39, 0.45)", zIndex: 50, padding: "24px", overflowY: "auto" }}>
        <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: "720px", margin: "40px auto", background: "#ffffff", borderRadius: "14px", padding: "20px", boxSizing: "border-box" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", alignItems: "flex-start", marginBottom: "16px" }}>
            <div>
              <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "4px" }}>{displayMailTitle(selectedMail)}</div>
              <div style={{ color: "#374151", fontSize: "14px" }}>{selectedMail.company?.trim() || selectedMail.recipientLabel || selectedMail.recipientEmail}</div>
            </div>
            <button type="button" onClick={() => { setSelectedMail(null); setSelectedMailDetail(null); }} style={{ border: "1px solid #cbd5e1", background: "#ffffff", borderRadius: "8px", padding: "6px 10px", cursor: "pointer" }}>Schließen</button>
          </div>
          {loadingDetail ? <div style={{ fontSize: "14px", color: "#6b7280" }}>Details werden geladen...</div> : selectedMailDetail ? <>
            <div style={{ display: "grid", gap: "10px", marginBottom: "16px", fontSize: "14px" }}>
              <DetailRow label="Von" value={selectedMailDetail.from || "-"} />
              <DetailRow label="Empfänger" value={(selectedMailDetail.to || []).join(", ") || "-"} />
              <DetailRow label="Datum" value={formatDate(selectedMailDetail.createdAt)} />
              <DetailRow label="Status" value={selectedMailDetail.lastEvent || "-"} />
              <DetailRow label="Betreff" value={selectedMailDetail.subject || "-"} />
            </div>
            <div>
              <div style={{ fontWeight: 600, marginBottom: "8px" }}>Mailtext</div>
              <div style={{ whiteSpace: "pre-wrap", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "12px", fontSize: "14px", lineHeight: 1.5, maxHeight: "400px", overflowY: "auto" }}>{selectedMailDetail.text || "Kein Plain-Text vorhanden. HTML liegt vor."}</div>
            </div>
          </> : <div style={{ fontSize: "14px", color: "#6b7280" }}>Keine Details geladen.</div>}
        </div>
      </div> : null}
    </>
  );
}
