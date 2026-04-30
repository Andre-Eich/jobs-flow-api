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
  analysisStars: 0 | 1 | 2 | 3;
  analysisSummary: string;
  foundJobTitles: string[];
  foundCareerUrls: string[];
  qualityStars: 0 | 1 | 2 | 3;
  qualitySummary: string;
  optOut: boolean;
  optOutAt: string;
  archived: boolean;
  archivedAt: string;
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

type DashboardHookMeta = {
  hookBaseId: string;
  hookBaseLabel: string;
  hookVariantId: string;
  hookText: string;
};

const HOOK_STYLE_OPTIONS = [
  { id: "auto", label: "Automatisch" },
  { id: "hybrid", label: "Hybrid" },
  { id: "punch", label: "Punch" },
  { id: "soft-personal", label: "Soft Personal" },
  { id: "problem-focus", label: "Problem-Fokus" },
  { id: "regional", label: "Regional" },
  { id: "reach", label: "Reichweite" },
  { id: "competition", label: "Wettbewerb" },
  { id: "social-proof", label: "Kundenbeweis" },
  { id: "minimal", label: "Minimal" },
  { id: "consultative", label: "Beratend" },
];

const BULK_TEXT_BLOCKS_KEY = "bulkTextBlocksV1";
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const NEW_LEAD_ID = "__new_lead__";

type CrmSortKey =
  | "company"
  | "email"
  | "postalCode"
  | "city"
  | "phone"
  | "channel"
  | "mails"
  | "quality"
  | "updatedAt";

type CrmSortDirection = "asc" | "desc";

function formatDate(dateString: string) {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    if (!Number.isFinite(date.getTime())) return "-";
    return date.toLocaleString("de-DE", {
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

function dateTime(value: string) {
  const time = new Date(value || "").getTime();
  return Number.isFinite(time) ? time : 0;
}

function getLastMailAt(lead: LeadRecord) {
  const latestMailTime = Math.max(0, ...lead.mails.map((mail) => dateTime(mail.createdAt)));
  return latestMailTime > 0 ? new Date(latestMailTime).toISOString() : "";
}

function getLastActivityAt(lead: LeadRecord) {
  const latestTime = Math.max(dateTime(lead.updatedAt), dateTime(getLastMailAt(lead)));
  return latestTime > 0 ? new Date(latestTime).toISOString() : "";
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

function stars(value: number) {
  const safe = Math.max(0, Math.min(3, Math.round(Number(value) || 0)));
  if (safe <= 0) return "–";
  return "★".repeat(safe);
}

function linesToItems(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
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

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: "8px",
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  fontSize: "14px",
  boxSizing: "border-box",
};

export default function CrmPage() {
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [archivedLeads, setArchivedLeads] = useState<LeadRecord[]>([]);
  const [bulkTextBlocks, setBulkTextBlocks] = useState<BulkTextBlock[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Lead-Dashboard
  const [dashboardLead, setDashboardLead] = useState<LeadRecord | null>(null);
  const [dashboardEditCompany, setDashboardEditCompany] = useState("");
  const [dashboardEditEmail, setDashboardEditEmail] = useState("");
  const [dashboardEditContactPerson, setDashboardEditContactPerson] = useState("");
  const [dashboardEditPhone, setDashboardEditPhone] = useState("");
  const [dashboardEditPostalCode, setDashboardEditPostalCode] = useState("");
  const [dashboardEditCity, setDashboardEditCity] = useState("");
  const [dashboardEditWebsite, setDashboardEditWebsite] = useState("");
  const [dashboardEditIndustry, setDashboardEditIndustry] = useState("");
  const [dashboardAnalysisStars, setDashboardAnalysisStars] = useState<0 | 1 | 2 | 3>(0);
  const [dashboardAnalysisSummary, setDashboardAnalysisSummary] = useState("");
  const [dashboardFoundJobTitles, setDashboardFoundJobTitles] = useState("");
  const [dashboardFoundCareerUrls, setDashboardFoundCareerUrls] = useState("");
  const [dashboardQualityStars, setDashboardQualityStars] = useState<0 | 1 | 2 | 3>(0);
  const [dashboardQualitySummary, setDashboardQualitySummary] = useState("");
  const [dashboardOptOut, setDashboardOptOut] = useState(false);
  const [dashboardSaving, setDashboardSaving] = useState(false);
  const [dashboardHookBaseId, setDashboardHookBaseId] = useState("auto");
  const [dashboardActiveBlockIds, setDashboardActiveBlockIds] = useState<string[]>([]);
  const [dashboardShortMode, setDashboardShortMode] = useState(false);
  const [dashboardTestMode, setDashboardTestMode] = useState(true);
  const [dashboardSendCopy, setDashboardSendCopy] = useState(false);
  const [dashboardSendReminderMode, setDashboardSendReminderMode] = useState(false);
  const [dashboardPreviewText, setDashboardPreviewText] = useState("");
  const [dashboardHookMeta, setDashboardHookMeta] = useState<DashboardHookMeta | null>(null);
  const [dashboardGenerating, setDashboardGenerating] = useState(false);
  const [dashboardSending, setDashboardSending] = useState(false);
  const [dashboardSendingReminder, setDashboardSendingReminder] = useState(false);
  const [dashboardError, setDashboardError] = useState("");
  const [dashboardSuccess, setDashboardSuccess] = useState("");
  const [archivingSelected, setArchivingSelected] = useState(false);

  // Batch-Erinnerung
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
  const [archiveOpen, setArchiveOpen] = useState(false);

  async function loadLeads() {
    try {
      setLoading(true);
      const response = await fetch("/api/crm/leads");
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "CRM konnte nicht geladen werden.");
        return;
      }
      const newLeads: LeadRecord[] = Array.isArray(data.leads) ? data.leads : [];
      const newArchivedLeads: LeadRecord[] = Array.isArray(data.archivedLeads) ? data.archivedLeads : [];
      setLeads(newLeads);
      setArchivedLeads(newArchivedLeads);
      setDashboardLead((prev) =>
        prev ? (newLeads.find((l) => l.id === prev.id) ?? newArchivedLeads.find((l) => l.id === prev.id) ?? prev) : null
      );
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

  const dashboardActiveBlocks = useMemo(
    () => bulkTextBlocks.filter((block) => dashboardActiveBlockIds.includes(block.id)),
    [bulkTextBlocks, dashboardActiveBlockIds]
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
      } else if (sortKey === "quality") {
        result = (a.qualityStars || 0) - (b.qualityStars || 0);
      } else {
        result = dateTime(getLastActivityAt(a)) - dateTime(getLastActivityAt(b));
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

  function openDashboard(lead: LeadRecord) {
    setDashboardLead(lead);
    setDashboardEditCompany(lead.company);
    setDashboardEditEmail(lead.recipientEmail);
    setDashboardEditContactPerson(lead.contactPerson);
    setDashboardEditPhone(lead.phone);
    setDashboardEditPostalCode(lead.postalCode || "");
    setDashboardEditCity(lead.city || "");
    setDashboardEditWebsite(lead.website || "");
    setDashboardEditIndustry(lead.industry || "");
    setDashboardAnalysisStars(lead.analysisStars || 0);
    setDashboardAnalysisSummary(lead.analysisSummary || "");
    setDashboardFoundJobTitles((lead.foundJobTitles || []).join("\n"));
    setDashboardFoundCareerUrls((lead.foundCareerUrls || []).join("\n"));
    setDashboardQualityStars(lead.qualityStars || 0);
    setDashboardQualitySummary(lead.qualitySummary || "");
    setDashboardOptOut(Boolean(lead.optOut));
    setDashboardHookBaseId("auto");
    setDashboardActiveBlockIds([]);
    setDashboardShortMode(false);
    setDashboardTestMode(true);
    setDashboardSendCopy(false);
    setDashboardSendReminderMode(false);
    setDashboardPreviewText("");
    setDashboardHookMeta(null);
    setDashboardError("");
    setDashboardSuccess("");
  }

  function openNewLeadDashboard() {
    const now = new Date().toISOString();
    setDashboardLead({
      id: NEW_LEAD_ID,
      company: "",
      postalCode: "",
      city: "",
      recipientEmail: "",
      phone: "",
      website: "",
      contactPerson: "",
      industry: "",
      analysisStars: 0,
      analysisSummary: "",
      foundJobTitles: [],
      foundCareerUrls: [],
      qualityStars: 0,
      qualitySummary: "",
      optOut: false,
      optOutAt: "",
      archived: false,
      archivedAt: "",
      channel: "kaltakquise",
      createdAt: now,
      updatedAt: now,
      mails: [],
    });
    setDashboardEditCompany("");
    setDashboardEditEmail("");
    setDashboardEditContactPerson("");
    setDashboardEditPhone("");
    setDashboardEditPostalCode("");
    setDashboardEditCity("");
    setDashboardEditWebsite("");
    setDashboardEditIndustry("");
    setDashboardAnalysisStars(0);
    setDashboardAnalysisSummary("");
    setDashboardFoundJobTitles("");
    setDashboardFoundCareerUrls("");
    setDashboardQualityStars(0);
    setDashboardQualitySummary("");
    setDashboardOptOut(false);
    setDashboardHookBaseId("auto");
    setDashboardActiveBlockIds([]);
    setDashboardShortMode(false);
    setDashboardTestMode(true);
    setDashboardSendCopy(false);
    setDashboardSendReminderMode(false);
    setDashboardPreviewText("");
    setDashboardHookMeta(null);
    setDashboardError("");
    setDashboardSuccess("");
  }

  async function saveDashboardLead() {
    if (!dashboardLead) return;
    setDashboardSaving(true);
    setDashboardError("");
    setDashboardSuccess("");
    try {
      if (dashboardLead.id === NEW_LEAD_ID) {
        if (!dashboardEditCompany.trim() && !dashboardEditEmail.trim()) {
          setDashboardError("Bitte mindestens Unternehmen oder E-Mail angeben.");
          return;
        }

        const response = await fetch("/api/crm/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            leads: [
              {
                company: dashboardEditCompany,
                postalCode: dashboardEditPostalCode,
                city: dashboardEditCity,
                recipientEmail: dashboardEditEmail,
                phone: dashboardEditPhone,
                website: dashboardEditWebsite,
                contactPerson: dashboardEditContactPerson,
                industry: dashboardEditIndustry,
                analysisStars: dashboardAnalysisStars,
                analysisSummary: dashboardAnalysisSummary,
                foundJobTitles: linesToItems(dashboardFoundJobTitles),
                foundCareerUrls: linesToItems(dashboardFoundCareerUrls),
                qualityStars: dashboardQualityStars,
                qualitySummary: dashboardQualitySummary,
              },
            ],
          }),
        });
        const data = await response.json();
        if (!response.ok) {
          setDashboardError(data.error || "Lead konnte nicht angelegt werden.");
          return;
        }

        const createdLead = Array.isArray(data.leads)
          ? (data.leads as LeadRecord[]).find((lead) => {
              const sameEmail =
                dashboardEditEmail.trim() &&
                lead.recipientEmail.trim().toLowerCase() === dashboardEditEmail.trim().toLowerCase();
              const sameCompany =
                dashboardEditCompany.trim() &&
                lead.company.trim().toLowerCase() === dashboardEditCompany.trim().toLowerCase();
              const sameCity =
                !dashboardEditCity.trim() ||
                lead.city.trim().toLowerCase() === dashboardEditCity.trim().toLowerCase();
              return (sameEmail || sameCompany) && sameCity;
            })
          : null;

        await loadLeads();
        if (createdLead) {
          openDashboard(createdLead);
        }
        setDashboardSuccess("Lead angelegt.");
        setTimeout(() => setDashboardSuccess(""), 2000);
        return;
      }

      const response = await fetch(`/api/crm/leads/${dashboardLead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: dashboardEditCompany,
          recipientEmail: dashboardEditEmail,
          contactPerson: dashboardEditContactPerson,
          phone: dashboardEditPhone,
          analysisStars: dashboardAnalysisStars,
          analysisSummary: dashboardAnalysisSummary,
          foundJobTitles: linesToItems(dashboardFoundJobTitles),
          foundCareerUrls: linesToItems(dashboardFoundCareerUrls),
          qualityStars: dashboardQualityStars,
          qualitySummary: dashboardQualitySummary,
          optOut: dashboardOptOut,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setDashboardError(data.error || "Speichern fehlgeschlagen.");
        return;
      }
      if (data.lead) {
        setDashboardLead(data.lead);
        setLeads((prev) => prev.map((l) => (l.id === data.lead.id ? data.lead : l)));
        setArchivedLeads((prev) => prev.map((l) => (l.id === data.lead.id ? data.lead : l)));
      }
      setDashboardSuccess("Gespeichert.");
      setTimeout(() => setDashboardSuccess(""), 2000);
    } catch {
      setDashboardError("Speichern fehlgeschlagen.");
    } finally {
      setDashboardSaving(false);
    }
  }

  async function generateDashboardPreview() {
    if (!dashboardLead) return;
    setDashboardGenerating(true);
    setDashboardError("");
    try {
      const response = await fetch("/api/regenerate-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: dashboardEditCompany || dashboardLead.company,
          contactPerson: dashboardEditContactPerson || dashboardLead.contactPerson,
          selectedHookBaseId: dashboardHookBaseId,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setDashboardError(data.error || "Vorschau konnte nicht generiert werden.");
        return;
      }
      setDashboardPreviewText(data.generatedEmail || "");
      setDashboardHookMeta(
        data.hookBaseId
          ? {
              hookBaseId: data.hookBaseId,
              hookBaseLabel: data.hookBaseLabel || "",
              hookVariantId: data.hookVariantId || "",
              hookText: data.hookText || "",
            }
          : null
      );
    } catch {
      setDashboardError("Vorschau konnte nicht generiert werden.");
    } finally {
      setDashboardGenerating(false);
    }
  }

  async function sendDashboardMail() {
    if (!dashboardLead || !dashboardPreviewText.trim() || dashboardOptOut) return;
    setDashboardSending(true);
    setDashboardError("");
    setDashboardSuccess("");
    try {
      const response = await fetch("/api/send-mail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: dashboardEditEmail || dashboardLead.recipientEmail,
          text: dashboardPreviewText,
          testMode: dashboardTestMode,
          sendCopy: dashboardSendCopy,
          company: dashboardEditCompany || dashboardLead.company,
          contactPerson: dashboardEditContactPerson || dashboardLead.contactPerson,
          phone: dashboardEditPhone || dashboardLead.phone,
          city: dashboardLead.city,
          postalCode: dashboardLead.postalCode,
          shortMode: dashboardShortMode,
          textBlockTitles: dashboardActiveBlocks.map((b) => b.title),
          hookBaseId: dashboardHookMeta?.hookBaseId,
          hookBaseLabel: dashboardHookMeta?.hookBaseLabel,
          hookVariantId: dashboardHookMeta?.hookVariantId,
          hookText: dashboardHookMeta?.hookText,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setDashboardError(data.error || "Mail konnte nicht gesendet werden.");
        return;
      }
      setDashboardSuccess(
        dashboardTestMode ? "Testmail gesendet." : "Mail gesendet."
      );
      setTimeout(() => setDashboardSuccess(""), 3000);
      setDashboardPreviewText("");
      setDashboardHookMeta(null);
      await loadLeads();
    } catch {
      setDashboardError("Mail konnte nicht gesendet werden.");
    } finally {
      setDashboardSending(false);
    }
  }

  async function sendDashboardReminder() {
    if (!dashboardLead || dashboardOptOut) return;
    setDashboardSendingReminder(true);
    setDashboardError("");
    setDashboardSuccess("");
    try {
      const response = await fetch("/api/crm/send-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: dashboardLead.id,
          recipientEmail: dashboardEditEmail || dashboardLead.recipientEmail,
          company: dashboardEditCompany || dashboardLead.company,
          city: dashboardLead.city,
          shortMode: dashboardShortMode,
          testMode: dashboardTestMode,
          sendCopy: dashboardSendCopy,
          textBlocks: dashboardActiveBlocks,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setDashboardError(data.error || "Erinnerung konnte nicht gesendet werden.");
        return;
      }
      setDashboardSuccess(
        dashboardTestMode ? "Test-Erinnerung gesendet." : "Erinnerung gesendet."
      );
      setTimeout(() => setDashboardSuccess(""), 3000);
      await loadLeads();
    } catch {
      setDashboardError("Erinnerung konnte nicht gesendet werden.");
    } finally {
      setDashboardSendingReminder(false);
    }
  }

  async function sendDashboardEmail() {
    if (dashboardSendReminderMode) {
      await sendDashboardReminder();
      return;
    }

    await sendDashboardMail();
  }

  function openReminderModal(targets: LeadRecord[]) {
    setReminderTargets(targets.filter((lead) => !lead.optOut && !lead.archived));
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
            recipientEmail: lead.recipientEmail,
            company: lead.company,
            city: lead.city,
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

  const isBusy =
    dashboardSaving || dashboardGenerating || dashboardSending || dashboardSendingReminder;
  const dashboardIsNew = dashboardLead?.id === NEW_LEAD_ID;
  const dashboardEmailSending = dashboardSendReminderMode ? dashboardSendingReminder : dashboardSending;
  const dashboardEmailDisabled = dashboardSendReminderMode
    ? dashboardSendingReminder || dashboardOptOut || dashboardIsNew
    : dashboardSending || !dashboardPreviewText.trim() || dashboardOptOut || dashboardIsNew;

  async function archiveSelectedLeads() {
    if (selectedLeadIds.length === 0) return;

    try {
      setArchivingSelected(true);
      setError("");

      for (const id of selectedLeadIds) {
        const response = await fetch(`/api/crm/leads/${id}`, {
          method: "DELETE",
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Leads konnten nicht archiviert werden.");
        }
      }

      await loadLeads();
      setSelectedLeadIds([]);
      setSuccessMessage(
        `${selectedLeadIds.length} Lead${selectedLeadIds.length === 1 ? "" : "s"} archiviert.`
      );
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Leads konnten nicht archiviert werden.");
    } finally {
      setArchivingSelected(false);
    }
  }

  async function restoreLead(id: string) {
    try {
      setError("");
      const response = await fetch(`/api/crm/leads/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore" }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Lead konnte nicht wiederhergestellt werden.");
        return;
      }
      await loadLeads();
      setSuccessMessage("Lead wurde aus dem Archiv wiederhergestellt.");
    } catch {
      setError("Lead konnte nicht wiederhergestellt werden.");
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
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", alignItems: "flex-start" }}>
            <div style={{ fontSize: "14px", color: "#6b7280" }}>Noch keine Leads vorhanden.</div>
            <button type="button" onClick={openNewLeadDashboard} style={buttonStyle(false)}>
              Neuen Lead anlegen
            </button>
          </div>
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
                <button
                  type="button"
                  onClick={archiveSelectedLeads}
                  disabled={selectedLeads.length === 0 || archivingSelected}
                  style={buttonStyle(false, selectedLeads.length === 0 || archivingSelected)}
                >
                  {archivingSelected ? "Archiviert..." : "Archivieren"}
                </button>
              </div>

              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={openNewLeadDashboard}
                  style={buttonStyle(false)}
                >
                  Neuen Lead anlegen
                </button>
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
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "900px" }}>
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
                        <SortButton label="Qualitaet" active={sortKey === "quality"} direction={sortDirection} onClick={() => toggleSort("quality")} />
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
                            {lead.optOut ? (
                              <div style={{ marginTop: "6px", fontSize: "12px", color: "#b91c1c", fontWeight: 700 }}>
                                Opt-out
                              </div>
                            ) : null}
                          </td>
                          <td style={tableCellStyle}>{lead.recipientEmail || "-"}</td>
                          <td style={tableCellStyle}>{lead.postalCode || "-"}</td>
                          <td style={tableCellStyle}>{lead.city || "-"}</td>
                          <td style={tableCellStyle}>{lead.phone || "-"}</td>
                          <td style={tableCellStyle}>{channelLabel(lead.channel)}</td>
                          <td style={tableCellStyle}>{lead.mails.length}</td>
                          <td style={tableCellStyle}>
                            <div style={{ fontSize: "16px", fontWeight: 700 }}>{stars(lead.qualityStars)}</div>
                          </td>
                          <td style={tableCellStyle}>{formatDate(getLastActivityAt(lead))}</td>
                          <td style={tableCellStyle}>
                            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                              <button
                                type="button"
                                onClick={() => openDashboard(lead)}
                                style={buttonStyle(false)}
                              >
                                Lead-Dashboard
                              </button>
                              <button
                                type="button"
                                onClick={() => openReminderModal([lead])}
                                disabled={lead.optOut}
                                style={buttonStyle(true, lead.optOut)}
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

            <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
              <button
                type="button"
                onClick={() => setArchiveOpen((prev) => !prev)}
                style={buttonStyle(false)}
              >
                {archiveOpen ? `Archiv ausblenden (${archivedLeads.length})` : `Archiv oeffnen (${archivedLeads.length})`}
              </button>
            </div>

            {archiveOpen ? (
              <div
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: "12px",
                  padding: "16px",
                  background: "#f9fafb",
                }}
              >
                <div style={{ fontSize: "16px", fontWeight: 700, marginBottom: "12px" }}>
                  Archiv
                </div>
                {archivedLeads.length === 0 ? (
                  <div style={{ fontSize: "13px", color: "#6b7280" }}>
                    Noch keine archivierten Leads vorhanden.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {archivedLeads.slice(0, 10).map((lead) => (
                      <div
                        key={lead.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: "12px",
                          alignItems: "center",
                          border: "1px solid #e5e7eb",
                          borderRadius: "10px",
                          padding: "12px",
                          background: "#ffffff",
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700 }}>{lead.company || "Unbekannter Lead"}</div>
                          <div style={{ fontSize: "12px", color: "#6b7280" }}>
                            {lead.recipientEmail || "-"}{lead.archivedAt ? ` · archiviert ${formatDate(lead.archivedAt)}` : ""}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                          <button type="button" onClick={() => openDashboard(lead)} style={buttonStyle(false)}>
                            Lead-Dashboard
                          </button>
                          <button type="button" onClick={() => restoreLead(lead.id)} style={buttonStyle(false)}>
                            Aktivieren
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </>
        )}
      </div>

      {/* Lead-Dashboard */}
      {dashboardLead ? (
        <div
          onClick={() => !isBusy && setDashboardLead(null)}
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
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "1200px",
              margin: "40px auto",
              background: "#ffffff",
              borderRadius: "14px",
              padding: "24px",
              boxSizing: "border-box",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "16px",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <div>
                <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "2px" }}>
                  Lead-Dashboard
                </div>
                <div style={{ fontSize: "14px", color: "#6b7280" }}>
                  {dashboardIsNew ? "Neuer manueller Lead" : dashboardLead.company || dashboardLead.recipientEmail}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDashboardLead(null)}
                disabled={isBusy}
                style={buttonStyle(false, isBusy)}
              >
                Schliessen
              </button>
            </div>

            {dashboardError ? (
              <div style={{ marginBottom: "14px", color: "#b91c1c", fontWeight: 600 }}>
                {dashboardError}
              </div>
            ) : null}
            {dashboardSuccess ? (
              <div style={{ marginBottom: "14px", color: "#166534", fontWeight: 600 }}>
                {dashboardSuccess}
              </div>
            ) : null}

            {/* Two-column layout */}
            <div style={{ display: "flex", gap: "24px", alignItems: "flex-start" }}>

              {/* Left panel: 1/3 */}
              <div
                style={{
                  width: "320px",
                  minWidth: "260px",
                  flexShrink: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                }}
              >
                {/* Email schicken */}
                <div
                  style={{
                    background: "#f9fafb",
                    border: "1px solid #e5e7eb",
                    borderRadius: "12px",
                    padding: "16px",
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: "14px", marginBottom: "14px" }}>
                    Email schicken
                  </div>

                  <div style={{ marginBottom: "16px" }}>
                    <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "10px" }}>
                      Text-Stil
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {HOOK_STYLE_OPTIONS.map((option) => {
                        const active = dashboardHookBaseId === option.id;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => setDashboardHookBaseId(option.id)}
                            style={{
                              padding: "5px 10px",
                              borderRadius: "999px",
                              border: "1px solid #cbd5e1",
                              fontSize: "12px",
                              cursor: "pointer",
                              background: active ? "#111827" : "#ffffff",
                              color: active ? "#ffffff" : "#111827",
                            }}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {bulkTextBlocks.length > 0 ? (
                    <div style={{ marginBottom: "16px" }}>
                      <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "10px" }}>
                        Textbausteine
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                        {bulkTextBlocks.map((block) => {
                          const active = dashboardActiveBlockIds.includes(block.id);
                          return (
                            <button
                              key={block.id}
                              type="button"
                              onClick={() =>
                                setDashboardActiveBlockIds((prev) =>
                                  prev.includes(block.id)
                                    ? prev.filter((id) => id !== block.id)
                                    : [...prev, block.id]
                                )
                              }
                              style={{
                                padding: "5px 10px",
                                borderRadius: "999px",
                                border: "1px solid #cbd5e1",
                                fontSize: "12px",
                                cursor: "pointer",
                                background: active ? "#111827" : "#ffffff",
                                color: active ? "#ffffff" : "#111827",
                              }}
                            >
                              {block.title}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "10px 14px",
                      fontSize: "14px",
                      marginBottom: "16px",
                    }}
                  >
                    <label style={{ cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={dashboardTestMode}
                        onChange={(e) => setDashboardTestMode(e.target.checked)}
                        style={{ marginRight: "6px" }}
                      />
                      Testmodus
                    </label>
                    <label style={{ cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={dashboardShortMode}
                        onChange={(e) => setDashboardShortMode(e.target.checked)}
                        style={{ marginRight: "6px" }}
                      />
                      Kurze Mail
                    </label>
                    <label style={{ cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={dashboardSendCopy}
                        onChange={(e) => setDashboardSendCopy(e.target.checked)}
                        style={{ marginRight: "6px" }}
                      />
                      Kopie an mich
                    </label>
                    <label style={{ cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={dashboardSendReminderMode}
                        onChange={(e) => setDashboardSendReminderMode(e.target.checked)}
                        style={{ marginRight: "6px" }}
                      />
                      Erinnerung senden
                    </label>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <button
                      type="button"
                      onClick={generateDashboardPreview}
                      disabled={dashboardGenerating || dashboardIsNew || dashboardSendReminderMode}
                      style={buttonStyle(false, dashboardGenerating || dashboardIsNew || dashboardSendReminderMode)}
                    >
                      {dashboardGenerating ? "Wird generiert..." : "Vorschau generieren"}
                    </button>
                    <button
                      type="button"
                      onClick={sendDashboardEmail}
                      disabled={dashboardEmailDisabled}
                      style={buttonStyle(true, dashboardEmailDisabled)}
                    >
                      {dashboardEmailSending ? "Wird gesendet..." : "Email senden"}
                    </button>
                  </div>
                </div>

                {/* Edit lead fields */}
                <div
                  style={{
                    background: "#f9fafb",
                    border: "1px solid #e5e7eb",
                    borderRadius: "12px",
                    padding: "16px",
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: "14px", marginBottom: "12px" }}>
                    {dashboardIsNew ? "Lead anlegen" : "Lead bearbeiten"}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: "12px",
                          fontWeight: 600,
                          color: "#6b7280",
                          marginBottom: "4px",
                        }}
                      >
                        Unternehmen
                      </label>
                      <input
                        value={dashboardEditCompany}
                        onChange={(e) => setDashboardEditCompany(e.target.value)}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: "12px",
                          fontWeight: 600,
                          color: "#6b7280",
                          marginBottom: "4px",
                        }}
                      >
                        E-Mail
                      </label>
                      <input
                        value={dashboardEditEmail}
                        onChange={(e) => setDashboardEditEmail(e.target.value)}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: "12px",
                          fontWeight: 600,
                          color: "#6b7280",
                          marginBottom: "4px",
                        }}
                      >
                        Ansprechpartner
                      </label>
                      <input
                        value={dashboardEditContactPerson}
                        onChange={(e) => setDashboardEditContactPerson(e.target.value)}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: "12px",
                          fontWeight: 600,
                          color: "#6b7280",
                          marginBottom: "4px",
                        }}
                      >
                        Telefon
                      </label>
                      <input
                        value={dashboardEditPhone}
                        onChange={(e) => setDashboardEditPhone(e.target.value)}
                        style={inputStyle}
                      />
                    </div>
                    {dashboardIsNew ? (
                      <>
                        <div>
                          <label
                            style={{
                              display: "block",
                              fontSize: "12px",
                              fontWeight: 600,
                              color: "#6b7280",
                              marginBottom: "4px",
                            }}
                          >
                            PLZ
                          </label>
                          <input
                            value={dashboardEditPostalCode}
                            onChange={(e) => setDashboardEditPostalCode(e.target.value)}
                            style={inputStyle}
                          />
                        </div>
                        <div>
                          <label
                            style={{
                              display: "block",
                              fontSize: "12px",
                              fontWeight: 600,
                              color: "#6b7280",
                              marginBottom: "4px",
                            }}
                          >
                            Ort
                          </label>
                          <input
                            value={dashboardEditCity}
                            onChange={(e) => setDashboardEditCity(e.target.value)}
                            style={inputStyle}
                          />
                        </div>
                        <div>
                          <label
                            style={{
                              display: "block",
                              fontSize: "12px",
                              fontWeight: 600,
                              color: "#6b7280",
                              marginBottom: "4px",
                            }}
                          >
                            Website
                          </label>
                          <input
                            value={dashboardEditWebsite}
                            onChange={(e) => setDashboardEditWebsite(e.target.value)}
                            style={inputStyle}
                          />
                        </div>
                        <div>
                          <label
                            style={{
                              display: "block",
                              fontSize: "12px",
                              fontWeight: 600,
                              color: "#6b7280",
                              marginBottom: "4px",
                            }}
                          >
                            Branche
                          </label>
                          <input
                            value={dashboardEditIndustry}
                            onChange={(e) => setDashboardEditIndustry(e.target.value)}
                            style={inputStyle}
                          />
                        </div>
                      </>
                    ) : null}
                    <div
                      style={{
                        borderTop: "1px solid #e5e7eb",
                        paddingTop: "10px",
                        marginTop: "2px",
                      }}
                    >
                      <div style={{ fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "8px" }}>
                        Analyse
                      </div>
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "8px" }}>
                        {[0, 1, 2, 3].map((value) => {
                          const active = dashboardAnalysisStars === value;
                          return (
                            <button
                              key={`analysis-${value}`}
                              type="button"
                              onClick={() => setDashboardAnalysisStars(value as 0 | 1 | 2 | 3)}
                              style={{
                                padding: "5px 10px",
                                borderRadius: "999px",
                                border: "1px solid #cbd5e1",
                                fontSize: "12px",
                                cursor: "pointer",
                                background: active ? "#111827" : "#ffffff",
                                color: active ? "#ffffff" : "#111827",
                              }}
                            >
                              {value === 0 ? "0" : stars(value)}
                            </button>
                          );
                        })}
                      </div>
                      <textarea
                        value={dashboardAnalysisSummary}
                        onChange={(e) => setDashboardAnalysisSummary(e.target.value)}
                        placeholder="Analyse-Hinweise"
                        style={{ ...inputStyle, minHeight: "90px", resize: "vertical" }}
                      />
                      <textarea
                        value={dashboardFoundJobTitles}
                        onChange={(e) => setDashboardFoundJobTitles(e.target.value)}
                        placeholder="Titel, jeweils eine Zeile"
                        style={{ ...inputStyle, minHeight: "72px", resize: "vertical", marginTop: "8px" }}
                      />
                      <textarea
                        value={dashboardFoundCareerUrls}
                        onChange={(e) => setDashboardFoundCareerUrls(e.target.value)}
                        placeholder="Karriere-URLs, jeweils eine Zeile"
                        style={{ ...inputStyle, minHeight: "72px", resize: "vertical", marginTop: "8px" }}
                      />
                    </div>
                    <div
                      style={{
                        borderTop: "1px solid #e5e7eb",
                        paddingTop: "10px",
                        marginTop: "2px",
                      }}
                    >
                      <div style={{ fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "8px" }}>
                        Qualitaet
                      </div>
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "8px" }}>
                        {[0, 1, 2, 3].map((value) => {
                          const active = dashboardQualityStars === value;
                          return (
                            <button
                              key={`quality-${value}`}
                              type="button"
                              onClick={() => setDashboardQualityStars(value as 0 | 1 | 2 | 3)}
                              style={{
                                padding: "5px 10px",
                                borderRadius: "999px",
                                border: "1px solid #cbd5e1",
                                fontSize: "12px",
                                cursor: "pointer",
                                background: active ? "#111827" : "#ffffff",
                                color: active ? "#ffffff" : "#111827",
                              }}
                            >
                              {value === 0 ? "0" : stars(value)}
                            </button>
                          );
                        })}
                      </div>
                      <textarea
                        value={dashboardQualitySummary}
                        onChange={(e) => setDashboardQualitySummary(e.target.value)}
                        placeholder="Qualitaets-Hinweise"
                        style={{ ...inputStyle, minHeight: "90px", resize: "vertical" }}
                      />
                    </div>
                    <div
                      style={{
                        borderTop: "1px solid #e5e7eb",
                        paddingTop: "10px",
                        marginTop: "2px",
                      }}
                    >
                      <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: 600 }}>
                        <input
                          type="checkbox"
                          checked={dashboardOptOut}
                          onChange={(e) => setDashboardOptOut(e.target.checked)}
                        />
                        Opt-out markieren
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={saveDashboardLead}
                      disabled={dashboardSaving}
                      style={buttonStyle(false, dashboardSaving)}
                    >
                      {dashboardSaving ? "Wird gespeichert..." : dashboardIsNew ? "Lead anlegen" : "Speichern"}
                    </button>
                  </div>
                </div>

              </div>

              {/* Right panel: 2/3 */}
              <div
                style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "20px" }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                    gap: "16px",
                  }}
                >
                  <div
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: "12px",
                      padding: "16px",
                      background: "#f9fafb",
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: "14px", marginBottom: "8px" }}>
                      Analyse
                    </div>
                    <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "8px" }}>
                      {stars(dashboardAnalysisStars)}
                    </div>
                    <div style={{ fontSize: "13px", lineHeight: 1.5, color: "#374151" }}>
                      {dashboardAnalysisSummary || "Noch keine Analyse-Hinweise gespeichert."}
                    </div>
                    {linesToItems(dashboardFoundJobTitles).length > 0 ? (
                      <div style={{ marginTop: "10px", fontSize: "12px", color: "#374151" }}>
                        <strong>Titel:</strong> {linesToItems(dashboardFoundJobTitles).join(", ")}
                      </div>
                    ) : null}
                    {linesToItems(dashboardFoundCareerUrls).length > 0 ? (
                      <div style={{ marginTop: "10px", fontSize: "12px", color: "#374151", wordBreak: "break-all" }}>
                        <strong>Karriere:</strong> {linesToItems(dashboardFoundCareerUrls)[0]}
                      </div>
                    ) : null}
                  </div>
                  <div
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: "12px",
                      padding: "16px",
                      background: "#f9fafb",
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: "14px", marginBottom: "8px" }}>
                      Lead-Qualitaet
                    </div>
                    <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "8px" }}>
                      {stars(dashboardQualityStars)}
                    </div>
                    <div style={{ fontSize: "13px", lineHeight: 1.5, color: "#374151" }}>
                      {dashboardQualitySummary || "Noch keine Qualitaets-Hinweise gespeichert."}
                    </div>
                    {dashboardOptOut ? (
                      <div style={{ marginTop: "10px", fontSize: "12px", fontWeight: 700, color: "#b91c1c" }}>
                        Opt-out aktiv
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Vorschau */}
                <div>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: "14px",
                      marginBottom: "8px",
                      color: dashboardPreviewText ? "#111827" : "#6b7280",
                    }}
                  >
                    {dashboardPreviewText
                      ? "Text-Vorschau (editierbar)"
                      : "Text-Vorschau — erst Vorschau generieren"}
                  </div>
                  <textarea
                    value={dashboardPreviewText}
                    onChange={(e) => setDashboardPreviewText(e.target.value)}
                    placeholder="Stil wählen und 'Vorschau generieren' klicken..."
                    style={{
                      width: "100%",
                      minHeight: "340px",
                      padding: "14px",
                      border: "1px solid #e5e7eb",
                      borderRadius: "10px",
                      fontSize: "14px",
                      lineHeight: 1.6,
                      fontFamily: "Arial, sans-serif",
                      resize: "vertical",
                      background: dashboardPreviewText ? "#ffffff" : "#f9fafb",
                      boxSizing: "border-box",
                      color: "#111827",
                    }}
                  />
                </div>

                {/* Gesendete E-Mails */}
                <div>
                  <div style={{ fontWeight: 700, fontSize: "14px", marginBottom: "10px" }}>
                    Gesendete E-Mails ({dashboardLead.mails.length})
                  </div>
                  {dashboardLead.mails.length === 0 ? (
                    <div style={{ fontSize: "14px", color: "#6b7280" }}>
                      Noch keine gesendeten E-Mails vorhanden.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {dashboardLead.mails.map((mail) => (
                        <div
                          key={mail.id}
                          style={{
                            border: "1px solid #e5e7eb",
                            borderRadius: "10px",
                            padding: "12px",
                            background: "#f9fafb",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: "12px",
                              marginBottom: "6px",
                              flexWrap: "wrap",
                            }}
                          >
                            <div style={{ fontWeight: 600, fontSize: "14px" }}>
                              {mail.subject || "Ohne Betreff"}
                            </div>
                            <div style={{ fontSize: "12px", color: "#6b7280" }}>
                              {formatDate(mail.createdAt)}
                            </div>
                          </div>
                          <div
                            style={{
                              fontSize: "12px",
                              color: "#6b7280",
                              display: "flex",
                              gap: "10px",
                              flexWrap: "wrap",
                              marginBottom: mail.bodyText ? "8px" : 0,
                            }}
                          >
                            <span>{channelLabel(mail.channel)}</span>
                            {mail.shortMode ? <span>Kurze Mail</span> : null}
                            {mail.testMode ? <span>Testmodus</span> : null}
                            {mail.textBlockTitles.length > 0 ? (
                              <span>Bausteine: {mail.textBlockTitles.join(", ")}</span>
                            ) : null}
                          </div>
                          {mail.bodyText ? (
                            <div
                              style={{
                                whiteSpace: "pre-wrap",
                                fontSize: "13px",
                                lineHeight: 1.5,
                                background: "#ffffff",
                                border: "1px solid #e5e7eb",
                                borderRadius: "8px",
                                padding: "10px",
                                maxHeight: "140px",
                                overflowY: "auto",
                              }}
                            >
                              {mail.bodyText}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Batch-Erinnerung */}
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
