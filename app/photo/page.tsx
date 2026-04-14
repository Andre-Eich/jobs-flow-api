"use client";

import { useEffect, useMemo, useState } from "react";
import BulkLeadsTableReplacementV4, {
  type BulkLead,
  type BulkLeadEmailOption,
} from "./BulkLeadsTable.replacement.v4";

// ---- Types ----

type HintKey = "multiple-jobs" | "social-media" | "print" | "multiposting";

type HookBaseId =
  | "auto"
  | "hybrid"
  | "punch"
  | "soft-personal"
  | "problem-focus"
  | "regional"
  | "reach"
  | "competition"
  | "social-proof"
  | "minimal"
  | "consultative";

type MainView = "mails" | "bulk" | "reminders" | "analytics";

type AnalyzeResponse = {
  jobTitle?: string;
  company?: string;
  contactPerson?: string;
  email?: string;
  jobTitleOptions?: string[];
  companyOptions?: string[];
  contactPersonOptions?: string[];
  emailOptions?: string[];
};

type JobData = {
  jobTitle: string;
  company: string;
  contactPerson: string;
  email: string;
  generatedEmail: string;
  jobTitleOptions: string[];
  companyOptions: string[];
  contactPersonOptions: string[];
  emailOptions: string[];
  hookBaseId?: string;
  hookBaseLabel?: string;
  hookVariantId?: string;
  hookText?: string;
};

type MailRecord = {
  id: string;
  subject: string;
  jobTitle?: string;
  company?: string;
  normalizedCompany?: string;
  contactPerson: string;
  recipientEmail: string;
  recipientLabel?: string;
  domain?: string;
  phone?: string;
  text?: string;
  status?: "sent" | "test" | "failed" | "draft";
  createdAt: string;
  kind?: "single" | "bulk";
  batchId?: string;
  searchLocation?: string;
  radiusKm?: string;
  textBlockTitles?: string[];
  shortMode?: boolean;
  testMode?: boolean;
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

type BulkPackageMailRecord = {
  id: string;
  leadId?: string;
  company: string;
  recipientEmail: string;
  phone?: string;
  subject: string;
  textBlockTitles: string[];
  contactPerson?: string;
  status: "planned" | "sending" | "sent" | "failed";
  errorMessage?: string;
  createdAt: string;
  updatedAt?: string;
  sentAt?: string;
};

type BulkPackageRecord = {
  id: string;
  label: string;
  createdAt: string;
  searchLocation: string;
  radiusKm: string;
  plannedCount: number;
  textBlockTitles: string[];
  shortMode: boolean;
  testMode: boolean;
  mails: BulkPackageMailRecord[];
};

// ---- Constants ----

const EMPTY_JOB_DATA: JobData = {
  jobTitle: "",
  company: "",
  contactPerson: "",
  email: "",
  generatedEmail: "",
  jobTitleOptions: [],
  companyOptions: [],
  contactPersonOptions: [],
  emailOptions: [],
  hookBaseId: "",
  hookBaseLabel: "",
  hookVariantId: "",
  hookText: "",
};

const HINT_OPTIONS: { key: HintKey; label: string }[] = [
  { key: "multiple-jobs", label: "Mehrere Jobs" },
  { key: "social-media", label: "Social-Media" },
  { key: "print", label: "Print-Anzeige" },
  { key: "multiposting", label: "Multiposting" },
];

const HOOK_OPTIONS: { value: HookBaseId; label: string }[] = [
  { value: "auto", label: "Automatisch" },
  { value: "hybrid", label: "Hybrid" },
  { value: "punch", label: "Punch" },
  { value: "soft-personal", label: "Soft Personal" },
  { value: "problem-focus", label: "Problem-Fokus" },
  { value: "regional", label: "Regional" },
  { value: "reach", label: "Reichweite" },
  { value: "competition", label: "Wettbewerb" },
  { value: "social-proof", label: "Kundenbeweis" },
  { value: "minimal", label: "Minimal" },
  { value: "consultative", label: "Beratend" },
];

const EMPTY_BULK_LEADS: BulkLead[] = [];
const BULK_TEXT_BLOCKS_KEY = "bulkTextBlocksV1";

// ---- Helpers ----

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

function buildBulkSearchContextKey(args: {
  location: string;
  focus: string;
  radius: string;
  count: string;
  onlyNewContacts: boolean;
}) {
  return JSON.stringify({
    location: args.location.trim().toLowerCase(),
    focus: args.focus.trim().toLowerCase(),
    radius: args.radius.trim(),
    count: args.count.trim(),
    onlyNewContacts: args.onlyNewContacts,
  });
}

function getBulkLeadSearchKey(lead: Pick<BulkLead, "searchKey" | "website" | "company" | "city">) {
  if (lead.searchKey?.trim()) {
    return lead.searchKey.trim().toLowerCase();
  }
  if (lead.website?.trim()) {
    return lead.website.trim().toLowerCase();
  }
  return `${normalizeCompany(lead.company)}|${lead.city.trim().toLowerCase()}`;
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

function packageStatusLabel(status: BulkPackageMailRecord["status"]) {
  if (status === "sending") return "sendet";
  if (status === "sent") return "gesendet";
  if (status === "failed") return "fehlgeschlagen";
  return "geplant";
}

function statusLabel(status: MailRecord["status"]) {
  switch (status) {
    case "sent": return "Gesendet";
    case "test": return "Test";
    case "failed": return "Fehler";
    case "draft": return "Entwurf";
    default: return status || "";
  }
}

function statusColor(status: MailRecord["status"]) {
  switch (status) {
    case "sent": return "#166534";
    case "test": return "#1d4ed8";
    case "failed": return "#b91c1c";
    case "draft": return "#6b7280";
    default: return "#6b7280";
  }
}

function displayMailTitle(mail: Pick<MailRecord, "jobTitle" | "subject">) {
  return mail.jobTitle?.trim() || mail.subject || "Ohne Betreff";
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)} %`;
}

function insertLinkTemplate(text: string) {
  const trimmed = String(text || "").trimEnd();
  const template = "[Linktext](https://example.de)";
  return trimmed ? `${trimmed}\n${template}` : template;
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

const uploadLabelStyle: React.CSSProperties = {
  padding: "10px 14px",
  border: "1px solid #cbd5e1",
  borderRadius: "8px",
  background: "#ffffff",
  cursor: "pointer",
};

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <label style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}>
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%",
          padding: "10px 12px",
          border: "1px solid #cbd5e1",
          borderRadius: "8px",
          background: "#ffffff",
          fontSize: "15px",
          boxSizing: "border-box",
        }}
      />
    </div>
  );
}

function FieldWithOptions({
  label,
  value,
  onChange,
  options,
  onSelectOption,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  onSelectOption: (value: string) => void;
}) {
  const alternativeOptions = options.filter((option) => option && option !== value);
  return (
    <div>
      <label style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}>
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "10px 12px",
          border: "1px solid #cbd5e1",
          borderRadius: "8px",
          background: "#ffffff",
          fontSize: "15px",
          boxSizing: "border-box",
        }}
      />
      {alternativeOptions.length > 0 && (
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "8px" }}>
          {alternativeOptions.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onSelectOption(option)}
              style={{
                padding: "6px 10px",
                border: "1px solid #cbd5e1",
                borderRadius: "999px",
                background: "#ffffff",
                color: "#111827",
                cursor: "pointer",
                fontSize: "13px",
              }}
            >
              {option}
            </button>
          ))}
        </div>
      )}
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
      <div style={{ fontSize: "20px", fontWeight: 700, lineHeight: 1.2, wordBreak: "break-word" }}>{value}</div>
      {subValue ? <div style={{ marginTop: "6px", fontSize: "12px", color: "#6b7280" }}>{subValue}</div> : null}
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

// ---- Component ----

export default function BulkMailServicePage() {
  // --- shared state ---
  const [mainView, setMainView] = useState<MainView>("mails");
  const [isMobile, setIsMobile] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // --- Kaltakquise state ---
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [jobUrl, setJobUrl] = useState("");
  const [selectedHints, setSelectedHints] = useState<HintKey[]>([]);
  const [selectedHookBaseId, setSelectedHookBaseId] = useState<HookBaseId>("auto");
  const [analyzingSource, setAnalyzingSource] = useState(false);
  const [generatingEmail, setGeneratingEmail] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [testMode, setTestMode] = useState(true);
  const [sendCopy, setSendCopy] = useState(true);
  const [jobData, setJobData] = useState<JobData>(EMPTY_JOB_DATA);
  const [crmView, setCrmView] = useState<"company" | "all">("all");
  const [crmHistory, setCrmHistory] = useState<MailRecord[]>([]);
  const [reminders, setReminders] = useState<MailRecord[]>([]);
  const [completedReminders, setCompletedReminders] = useState<string[]>([]);
  const [selectedMail, setSelectedMail] = useState<MailRecord | null>(null);
  const [selectedMailDetail, setSelectedMailDetail] = useState<MailDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [remindersCollapsed, setRemindersCollapsed] = useState(false);
  const [dismissedReminderIds, setDismissedReminderIds] = useState<string[]>([]);
  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null);
  const [sendingAllReminders, setSendingAllReminders] = useState(false);
  const [loadingCrm, setLoadingCrm] = useState(false);
  const [loadingTextStats, setLoadingTextStats] = useState(false);
  const [textStats, setTextStats] = useState<HookBaseStats[]>([]);
  const [selectedAnalyticsHookId, setSelectedAnalyticsHookId] = useState("");

  // --- Streumail state ---
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [mailHistory, setMailHistory] = useState<MailRecord[]>([]);
  const [bulkPackageHistory, setBulkPackageHistory] = useState<BulkPackageRecord[]>([]);
  const [bulkLocation, setBulkLocation] = useState("");
  const [bulkFocus, setBulkFocus] = useState("");
  const [bulkRadius, setBulkRadius] = useState("30");
  const [bulkCount, setBulkCount] = useState("20");
  const [bulkOnlyNewContacts, setBulkOnlyNewContacts] = useState(false);
  const [bulkLeads, setBulkLeads] = useState<BulkLead[]>(EMPTY_BULK_LEADS);
  const [ignoredLeadKeysBySearch, setIgnoredLeadKeysBySearch] = useState<Record<string, string[]>>({});
  const [findingBulkLeads, setFindingBulkLeads] = useState(false);
  const [bulkTestMode, setBulkTestMode] = useState(true);
  const [bulkShortMode, setBulkShortMode] = useState(false);
  const [bulkTextBlocks, setBulkTextBlocks] = useState<BulkTextBlock[]>([]);
  const [activeBulkTextBlockIds, setActiveBulkTextBlockIds] = useState<string[]>([]);
  const [editingBulkTextBlock, setEditingBulkTextBlock] = useState<BulkTextBlock | null>(null);
  const [bulkEditorOpen, setBulkEditorOpen] = useState(false);
  const [selectedBulkPackageId, setSelectedBulkPackageId] = useState<string | null>(null);

  // ---- Effects ----

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
      const saved = localStorage.getItem("dismissedReminderIds");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setDismissedReminderIds(parsed);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("dismissedReminderIds", JSON.stringify(dismissedReminderIds));
    } catch {
      // ignore
    }
  }, [dismissedReminderIds]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(BULK_TEXT_BLOCKS_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return;
      const normalized = parsed
        .map((item) => ({
          id: String(item?.id || crypto.randomUUID()),
          title: String(item?.title || "").trim(),
          text: String(item?.text || "").trim(),
        }))
        .filter((item) => item.title || item.text);
      setBulkTextBlocks(normalized);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(BULK_TEXT_BLOCKS_KEY, JSON.stringify(bulkTextBlocks));
    } catch {
      // ignore
    }
  }, [bulkTextBlocks]);

  // ---- Memos ----

  const currentDomain = useMemo(() => getDomain(jobData.email), [jobData.email]);
  const currentCompany = useMemo(() => normalizeCompany(jobData.company), [jobData.company]);

  const visibleReminders = useMemo(
    () =>
      reminders.filter(
        (item) =>
          !completedReminders.includes(item.id) && !dismissedReminderIds.includes(item.id)
      ),
    [reminders, completedReminders, dismissedReminderIds]
  );

  const selectedHookStats = useMemo(
    () => textStats.find((item) => item.hookBaseId === selectedAnalyticsHookId) || null,
    [textStats, selectedAnalyticsHookId]
  );

  const activeBulkTextBlocks = useMemo(
    () => bulkTextBlocks.filter((block) => activeBulkTextBlockIds.includes(block.id)),
    [bulkTextBlocks, activeBulkTextBlockIds]
  );

  const bulkPackages = useMemo(() => {
    const storedMap = new Map(
      bulkPackageHistory.map((item) => [
        item.id,
        { ...item, label: `Mail-Paket ${formatDate(item.createdAt)}` },
      ])
    );
    const grouped = new Map<string, MailRecord[]>();

    for (const mail of mailHistory.filter((item) => item.kind === "bulk")) {
      const key = mail.batchId?.trim() || mail.id;
      const existing = grouped.get(key) || [];
      existing.push(mail);
      grouped.set(key, existing);
    }

    for (const [key, mails] of grouped.entries()) {
      if (storedMap.has(key)) continue;
      const sortedMails = [...mails].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      const firstMail = sortedMails[0];
      storedMap.set(key, {
        id: key,
        label: `Mail-Paket ${formatDate(firstMail?.createdAt || new Date().toISOString())}`,
        createdAt: firstMail?.createdAt || new Date().toISOString(),
        searchLocation: firstMail?.searchLocation || "",
        radiusKm: firstMail?.radiusKm || "",
        plannedCount: sortedMails.length,
        textBlockTitles: firstMail?.textBlockTitles || [],
        shortMode: Boolean(firstMail?.shortMode),
        testMode: Boolean(firstMail?.testMode),
        mails: sortedMails.map((mail) => ({
          id: mail.id,
          leadId: "",
          company: mail.company || "",
          recipientEmail: mail.recipientEmail,
          phone: mail.phone || "",
          subject: mail.subject || "",
          textBlockTitles: mail.textBlockTitles || [],
          contactPerson: mail.contactPerson || "",
          status: "sent" as const,
          errorMessage: "",
          createdAt: mail.createdAt,
          updatedAt: mail.createdAt,
          sentAt: mail.createdAt,
        })),
      });
    }

    return Array.from(storedMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [bulkPackageHistory, mailHistory]);

  const selectedBulkPackage = useMemo(
    () => bulkPackages.find((item) => item.id === selectedBulkPackageId) || null,
    [bulkPackages, selectedBulkPackageId]
  );

  const currentBulkSearchKey = useMemo(
    () =>
      buildBulkSearchContextKey({
        location: bulkLocation,
        focus: bulkFocus,
        radius: bulkRadius,
        count: bulkCount,
        onlyNewContacts: bulkOnlyNewContacts,
      }),
    [bulkLocation, bulkFocus, bulkRadius, bulkCount, bulkOnlyNewContacts]
  );

  // ---- Data loaders ----

  async function loadCrm() {
    try {
      setLoadingCrm(true);
      const params = new URLSearchParams({ mode: crmView });
      if (currentDomain) params.set("domain", currentDomain);
      if (currentCompany) params.set("company", currentCompany);
      const response = await fetch(`/api/crm/emails?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "CRM konnte nicht geladen werden.");
        return;
      }
      const loadedEmails: MailRecord[] = Array.isArray(data.emails) ? data.emails : [];
      const loadedReminders: MailRecord[] = Array.isArray(data.reminders) ? data.reminders : [];
      setCrmHistory(loadedEmails);
      setReminders(loadedReminders);
      const preCompleted = loadedEmails
        .filter((mail) => mail.reminded)
        .map((mail) => mail.id);
      setCompletedReminders((prev) => Array.from(new Set([...prev, ...preCompleted])));
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
      const hooks: HookBaseStats[] = Array.isArray(data.hooks) ? data.hooks : [];
      setTextStats(hooks);
      if (hooks.length > 0 && !selectedAnalyticsHookId) {
        setSelectedAnalyticsHookId(hooks[0].hookBaseId);
      }
    } catch {
      setError("Text-Auswertungen konnten nicht geladen werden.");
    } finally {
      setLoadingTextStats(false);
    }
  }

  async function loadHistory() {
    try {
      setLoadingHistory(true);
      const [emailsResponse, packagesResponse] = await Promise.all([
        fetch("/api/crm/emails?mode=all"),
        fetch("/api/crm/bulk-packages"),
      ]);
      const emailsData = await emailsResponse.json();
      const packagesData = await packagesResponse.json();
      if (!emailsResponse.ok) {
        setError(emailsData.error || "Historie konnte nicht geladen werden.");
        return;
      }
      if (!packagesResponse.ok) {
        setError(packagesData.error || "Historie konnte nicht geladen werden.");
        return;
      }
      setMailHistory(Array.isArray(emailsData.emails) ? emailsData.emails : []);
      setBulkPackageHistory(Array.isArray(packagesData.packages) ? packagesData.packages : []);
    } catch {
      setError("Historie konnte nicht geladen werden.");
    } finally {
      setLoadingHistory(false);
    }
  }

  // Load CRM when view/filter changes
  useEffect(() => {
    loadCrm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crmView, currentDomain, currentCompany]);

  // Load analytics when switching to that tab
  useEffect(() => {
    if (mainView === "analytics") {
      loadTextStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainView]);

  // Load Streumail history on mount
  useEffect(() => {
    loadHistory();
  }, []);

  // ---- Kaltakquise helpers ----

  function toggleHint(hint: HintKey) {
    setSelectedHints((prev) =>
      prev.includes(hint) ? prev.filter((item) => item !== hint) : [...prev, hint]
    );
  }

  function uniqueOptions(primary: string, options?: string[]) {
    const values = [primary, ...(options || [])].map((v) => (v || "").trim()).filter(Boolean);
    return Array.from(new Set(values));
  }

  function applyAnalyzeData(data: AnalyzeResponse) {
    setJobData((prev) => ({
      ...prev,
      jobTitle: data.jobTitle || "",
      company: data.company || "",
      contactPerson: data.contactPerson || "",
      email: data.email || "",
      generatedEmail: "",
      jobTitleOptions: uniqueOptions(data.jobTitle || "", data.jobTitleOptions),
      companyOptions: uniqueOptions(data.company || "", data.companyOptions),
      contactPersonOptions: uniqueOptions(data.contactPerson || "", data.contactPersonOptions),
      emailOptions: uniqueOptions(data.email || "", data.emailOptions),
    }));
  }

  function setFieldValue<K extends keyof Pick<JobData, "jobTitle" | "company" | "contactPerson" | "email">>(
    key: K,
    value: string
  ) {
    setJobData((prev) => ({ ...prev, [key]: value }));
  }

  function dismissReminder(reminderId: string) {
    setDismissedReminderIds((prev) =>
      prev.includes(reminderId) ? prev : [...prev, reminderId]
    );
  }

  async function handlePasteUrl() {
    setError("");
    setSuccessMessage("");
    try {
      const text = await navigator.clipboard.readText();
      const pasted = text.trim();
      if (!pasted) {
        setError("Zwischenablage ist leer.");
        return;
      }
      if (!/^https?:\/\//i.test(pasted)) {
        setError("In der Zwischenablage wurde keine gueltige URL gefunden.");
        return;
      }
      setJobUrl(pasted);
      setSuccessMessage("URL aus der Zwischenablage eingefuegt.");
    } catch {
      setError("Auf die Zwischenablage konnte nicht zugegriffen werden.");
    }
  }

  async function handleAnalyzeSource() {
    setError("");
    setSuccessMessage("");
    const hasUrl = jobUrl.trim().length > 0;
    const hasFile = !!selectedFile;
    if (!hasUrl && !hasFile) {
      setError(
        isMobile
          ? "Bitte eine Datei auswaehlen, ein Foto aufnehmen oder eine URL einfuegen."
          : "Bitte eine Anzeigen-URL eingeben oder eine Datei auswaehlen."
      );
      return;
    }
    try {
      setAnalyzingSource(true);
      if (hasUrl) {
        const response = await fetch("/api/photo-to-mail-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: jobUrl.trim(), hints: selectedHints }),
        });
        const data = await response.json();
        if (!response.ok) {
          setError(data.error || "Fehler bei der URL-Analyse.");
          return;
        }
        applyAnalyzeData(data);
        setSuccessMessage("Quelle analysiert. Bitte Felder pruefen, Hinweise waehlen und dann die E-Mail generieren.");
        return;
      }
      if (hasFile) {
        const formData = new FormData();
        formData.append("file", selectedFile as File);
        formData.append("hints", JSON.stringify(selectedHints));
        const response = await fetch("/api/photo-to-mail", {
          method: "POST",
          body: formData,
        });
        const data = await response.json();
        if (!response.ok) {
          setError(data.error || "Fehler bei der Analyse.");
          return;
        }
        applyAnalyzeData(data);
        setSuccessMessage("Quelle analysiert. Bitte Felder pruefen, Hinweise waehlen und dann die E-Mail generieren.");
      }
    } catch {
      setError("Die Quelle konnte nicht analysiert werden.");
    } finally {
      setAnalyzingSource(false);
    }
  }

  async function handleGenerateEmail() {
    setError("");
    setSuccessMessage("");
    if (!jobData.jobTitle.trim() && !jobData.company.trim()) {
      setError("Bitte zuerst eine Quelle analysieren.");
      return;
    }
    try {
      setGeneratingEmail(true);
      const response = await fetch("/api/regenerate-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobTitle: jobData.jobTitle,
          company: jobData.company,
          contactPerson: jobData.contactPerson,
          email: jobData.email,
          hints: selectedHints,
          selectedHookBaseId,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Fehler bei der E-Mail-Generierung.");
        return;
      }
      setJobData((prev) => ({
        ...prev,
        generatedEmail: data.generatedEmail || "",
        hookBaseId: data.hookBaseId || "",
        hookBaseLabel: data.hookBaseLabel || "",
        hookVariantId: data.hookVariantId || "",
        hookText: data.hookText || "",
      }));
      setSuccessMessage("E-Mail erfolgreich generiert.");
    } catch {
      setError("Die E-Mail konnte nicht generiert werden.");
    } finally {
      setGeneratingEmail(false);
    }
  }

  async function handleSendEmail() {
    setError("");
    setSuccessMessage("");
    if (!jobData.generatedEmail.trim()) {
      setError("Bitte zuerst eine E-Mail generieren.");
      return;
    }
    if (!testMode && !jobData.email.trim()) {
      setError("Keine E-Mail-Adresse des Unternehmens vorhanden.");
      return;
    }
    try {
      setSendingEmail(true);
      const response = await fetch("/api/send-mail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: jobData.email,
          text: jobData.generatedEmail,
          testMode,
          sendCopy,
          jobTitle: jobData.jobTitle,
          company: jobData.company,
          contactPerson: jobData.contactPerson,
          hints: selectedHints,
          hookBaseId: jobData.hookBaseId || selectedHookBaseId,
          hookBaseLabel:
            jobData.hookBaseLabel ||
            HOOK_OPTIONS.find((item) => item.value === selectedHookBaseId)?.label ||
            "Automatisch",
          hookVariantId: jobData.hookVariantId || "",
          hookText: jobData.hookText || "",
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Fehler beim Senden.");
        return;
      }
      setSuccessMessage(testMode ? "Test-E-Mail erfolgreich an dich gesendet." : "E-Mail erfolgreich gesendet.");
      await loadCrm();
      if (mainView === "analytics") await loadTextStats();
    } catch {
      setError("Die E-Mail konnte nicht gesendet werden.");
    } finally {
      setSendingEmail(false);
    }
  }

  async function handleReminderQuickSend(item: MailRecord, reloadAfter = true) {
    setError("");
    setSuccessMessage("");
    try {
      setSendingReminderId(item.id);
      const genResponse = await fetch("/api/regenerate-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobTitle: item.jobTitle || item.subject,
          company: item.company || "",
          contactPerson: item.contactPerson || "",
          hints: [],
          followUp: true,
        }),
      });
      const genData = await genResponse.json();
      if (!genResponse.ok) {
        setError(genData.error || "Erinnerungs-Mail konnte nicht generiert werden.");
        return;
      }
      const sendResponse = await fetch("/api/send-mail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: item.recipientEmail,
          text: genData.generatedEmail,
          testMode: true,
          sendCopy: true,
          jobTitle: item.jobTitle || item.subject,
          company: item.company || "",
          contactPerson: item.contactPerson || "",
          hints: [],
          followUp: true,
          originalEmailId: item.id,
          hookBaseId: "followup",
          hookBaseLabel: "Follow-up",
          hookVariantId: "followup_default",
          hookText: genData.generatedEmail || "",
        }),
      });
      const sendData = await sendResponse.json();
      if (!sendResponse.ok) {
        setError(sendData.error || "Erinnerungs-Mail konnte nicht gesendet werden.");
        return;
      }
      setCompletedReminders((prev) => [...prev, item.id]);
      setReminders((prev) => prev.filter((r) => r.id !== item.id));
      setSuccessMessage(`Erinnerungs-Mail (Test) fuer "${displayMailTitle(item)}" wurde an dich gesendet.`);
      if (reloadAfter) {
        await loadCrm();
        if (mainView === "analytics") await loadTextStats();
      }
    } catch {
      setError("Erinnerungs-Mail konnte nicht gesendet werden.");
    } finally {
      setSendingReminderId(null);
    }
  }

  async function handleSendAllReminders() {
    if (!visibleReminders.length) return;
    setError("");
    setSuccessMessage("");
    try {
      setSendingAllReminders(true);
      for (const item of visibleReminders) {
        await handleReminderQuickSend(item, false);
      }
      setSuccessMessage("Alle offenen Erinnerungen wurden als Test verschickt.");
      await loadCrm();
      if (mainView === "analytics") await loadTextStats();
    } catch {
      setError("Nicht alle Erinnerungen konnten verschickt werden.");
    } finally {
      setSendingAllReminders(false);
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

  const hasAnalyzedSource = !!jobData.jobTitle || !!jobData.company || !!jobData.contactPerson || !!jobData.email;

  // ---- Streumail helpers ----

  function updateBulkLead(id: string, patch: Partial<BulkLead>) {
    setBulkLeads((prev) => prev.map((lead) => (lead.id === id ? { ...lead, ...patch } : lead)));
  }

  async function persistBulkLeadToCrm(lead: BulkLead, overrides?: Partial<BulkLead>) {
    const nextLead = { ...lead, ...overrides };

    try {
      await fetch("/api/crm/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leads: [
            {
              company: nextLead.company,
              postalCode: "",
              city: nextLead.city || bulkLocation.trim(),
              recipientEmail: nextLead.email || "",
              phone: nextLead.phone || "",
              website: nextLead.website || "",
              contactPerson: nextLead.contactPerson || "",
              industry: nextLead.industry || "",
              analysisStars: nextLead.analysisStars,
              analysisSummary: nextLead.analysisSummary,
              foundJobTitles: nextLead.foundJobTitles || [],
              foundCareerUrls: nextLead.foundCareerUrls || [],
              qualityStars: nextLead.qualityStars,
              qualitySummary: nextLead.qualitySummary,
            },
          ],
        }),
      });
    } catch {
      // Persisting insights is helpful but should not block the bulk workflow.
    }
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

  async function handleFindBulkLeads() {
    setError("");
    setSuccessMessage("");
    const location = bulkLocation.trim();
    const count = Number(bulkCount);
    if (!location) {
      setError("Bitte Ort oder PLZ fuer Streumail eingeben.");
      return;
    }
    try {
      setFindingBulkLeads(true);
      const excludeKeys = ignoredLeadKeysBySearch[currentBulkSearchKey] || [];
      const response = await fetch("/api/bulk-find-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location,
          focus: bulkFocus.trim(),
          count,
          radius: bulkRadius,
          onlyNewContacts: bulkOnlyNewContacts,
          excludeKeys,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Die Firmenliste konnte nicht geladen werden.");
        return;
      }
      const nextLeads: BulkLead[] = Array.isArray(data.leads) ? data.leads : [];
      if (nextLeads.length === 0) {
        setBulkLeads([]);
        setSuccessMessage("Keine passenden Unternehmen fuer diese Suche gefunden.");
        return;
      }
      setBulkLeads(nextLeads);
      setIgnoredLeadKeysBySearch((prev) => {
        const nextKeys = nextLeads.map((lead) => getBulkLeadSearchKey(lead)).filter(Boolean);
        const existingKeys = prev[currentBulkSearchKey] || [];
        return {
          ...prev,
          [currentBulkSearchKey]: Array.from(new Set([...existingKeys, ...nextKeys])),
        };
      });
      setSuccessMessage(`${nextLeads.length} Unternehmen fuer ${location} geladen.`);
    } catch {
      setError("Die Firmenliste konnte nicht geladen werden.");
    } finally {
      setFindingBulkLeads(false);
    }
  }

  async function handleAnalyzeBulkLead(id: string) {
    const lead = bulkLeads.find((item) => item.id === id);
    if (!lead) return;
    updateBulkLead(id, { analysisStatus: "loading" });
    try {
      const response = await fetch("/api/bulk-analyze-company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company: lead.company, website: lead.website, city: lead.city }),
      });
      const data = await response.json();
      if (!response.ok) {
        updateBulkLead(id, { analysisStatus: "error", analysisSummary: data.error || "Analyse fehlgeschlagen." });
        return;
      }
      updateBulkLead(id, {
        analysisStatus: data.analysisStatus || "done",
        analysisStars: Number(data.analysisStars || 0) as 0 | 1 | 2 | 3,
        analysisSummary: String(data.analysisSummary || "").trim(),
        foundJobTitles: Array.isArray(data.foundJobTitles) ? data.foundJobTitles : [],
        foundCareerUrls: Array.isArray(data.foundCareerUrls) ? data.foundCareerUrls : [],
      });
      await persistBulkLeadToCrm(lead, {
        analysisStars: Number(data.analysisStars || 0) as 0 | 1 | 2 | 3,
        analysisSummary: String(data.analysisSummary || "").trim(),
        foundJobTitles: Array.isArray(data.foundJobTitles) ? data.foundJobTitles : [],
        foundCareerUrls: Array.isArray(data.foundCareerUrls) ? data.foundCareerUrls : [],
      });
    } catch {
      updateBulkLead(id, { analysisStatus: "error", analysisSummary: "Analyse fehlgeschlagen." });
    }
  }

  async function handleCollectBulkData(id: string) {
    const lead = bulkLeads.find((item) => item.id === id);
    if (!lead) return;
    updateBulkLead(id, { contactStatus: "loading" });
    try {
      const response = await fetch("/api/bulk-collect-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company: lead.company, website: lead.website }),
      });
      const data = await response.json();
      if (!response.ok) {
        updateBulkLead(id, { contactStatus: "error" });
        return;
      }
      updateBulkLead(id, {
        contactStatus: data.contactStatus || "done",
        email: String(data.email || "").trim(),
        emailOptions: Array.isArray(data.emailOptions) ? (data.emailOptions as BulkLeadEmailOption[]) : [],
        emailNeedsReview: Boolean(data.emailNeedsReview),
        contactPerson: String(data.contactPerson || "").trim(),
        contactPersonOptions: Array.isArray(data.contactPersonOptions) ? data.contactPersonOptions : [],
        phone: String(data.phone || "").trim(),
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
      const sameDomain = domain && getDomain(mail.recipientEmail) === domain;
      const sameCompany =
        normalizedLeadCompany && mail.company && normalizeCompany(mail.company) === normalizedLeadCompany;
      return (sameEmail || sameDomain || sameCompany) && isWithinLast14Days(mail.createdAt);
    });

    let qualityStars: 0 | 1 | 2 | 3 = 1;
    let qualitySummary = "Es gibt erste Hinweise, aber noch begrenzte Daten.";
    if (lead.analysisStars >= 2 && lead.email) {
      qualityStars = 2;
      qualitySummary = "Es gibt genug Daten fuer eine brauchbare Vertriebsmail.";
    }
    if (lead.analysisStars >= 3 && lead.email && lead.industry && lead.contactPerson) {
      qualityStars = 3;
      qualitySummary = "Guter Lead: klare Recruiting-Hinweise und belastbare Kontaktdaten.";
    }
    if (lead.emailNeedsReview) qualitySummary += " Email bitte pruefen.";
    if (existing) {
      qualitySummary += ` Bereits in den letzten 14 Tagen kontaktiert (${formatDate(existing.createdAt)}).`;
    }

    updateBulkLead(id, {
      qualityStatus: "done",
      qualityStars,
      qualitySummary,
      alreadyContacted: Boolean(existing),
      lastContactAt: existing?.createdAt || "",
    });
    await persistBulkLeadToCrm(lead, {
      qualityStars,
      qualitySummary,
    });
  }

  async function generateBulkEmailForLead(lead: BulkLead) {
    const response = await fetch("/api/generate-bulk-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company: lead.company,
        industry: lead.industry,
        analysisSummary: lead.analysisSummary,
        contactPerson: lead.contactPerson,
        shortMode: bulkShortMode,
        textBlocks: activeBulkTextBlocks,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Bulk-Mail konnte nicht generiert werden.");
    }
    return {
      subject: String(data.subject || "").trim(),
      text: String(data.text || "").trim(),
    };
  }

  function replaceBulkPackageInState(nextPackage: BulkPackageRecord) {
    setBulkPackageHistory((prev) => {
      const existing = prev.find((item) => item.id === nextPackage.id);
      if (!existing) return [nextPackage, ...prev];
      return prev.map((item) => (item.id === nextPackage.id ? nextPackage : item));
    });
  }

  async function updatePackageMailStatus(
    packageId: string,
    mailId: string,
    status: BulkPackageMailRecord["status"],
    extras?: { errorMessage?: string; subject?: string }
  ) {
    const response = await fetch("/api/crm/bulk-packages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        packageId,
        mailId,
        status,
        errorMessage: extras?.errorMessage || "",
        subject: extras?.subject || "",
      }),
    });
    const data = await response.json();
    if (response.ok && data.package) {
      replaceBulkPackageInState(data.package as BulkPackageRecord);
    }
    return response.ok;
  }

  async function handleSendBulkBatch(ids: string[]) {
    const leadsToSend = ids
      .map((id) => bulkLeads.find((item) => item.id === id))
      .filter((lead): lead is BulkLead => Boolean(lead?.email));

    if (leadsToSend.length === 0) {
      setError("Bitte mindestens einen versandfaehigen Lead auswaehlen.");
      return;
    }

    setError("");
    setSuccessMessage("");
    leadsToSend.forEach((lead) => updateBulkLead(lead.id, { sendStatus: "loading" }));

    const packageId = crypto.randomUUID();
    const textBlockTitles = activeBulkTextBlocks.map((block) => block.title);

    const crmCreateResponse = await fetch("/api/crm/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leads: leadsToSend.map((lead) => ({
          company: lead.company,
          postalCode: "",
          city: lead.city || bulkLocation.trim(),
          recipientEmail: lead.email,
          phone: lead.phone || "",
          website: lead.website || "",
          contactPerson: lead.contactPerson || "",
          industry: lead.industry || "",
          analysisStars: lead.analysisStars,
          analysisSummary: lead.analysisSummary,
          foundJobTitles: lead.foundJobTitles,
          foundCareerUrls: lead.foundCareerUrls,
          qualityStars: lead.qualityStars,
          qualitySummary: lead.qualitySummary,
        })),
      }),
    });
    const crmCreateData = await crmCreateResponse.json();

    if (!crmCreateResponse.ok) {
      leadsToSend.forEach((lead) => updateBulkLead(lead.id, { sendStatus: "error" }));
      setError(crmCreateData.error || "Ausgewaehlte Kontakte konnten nicht ins CRM uebernommen werden.");
      return;
    }

    const generatedEntries = await Promise.all(
      leadsToSend.map(async (lead) => {
        try {
          const generated = await generateBulkEmailForLead(lead);
          return {
            lead,
            generated,
            packageMail: {
              id: crypto.randomUUID(),
              leadId: lead.id,
              company: lead.company,
              recipientEmail: lead.email,
              phone: lead.phone || "",
              subject: generated.subject,
              textBlockTitles,
              contactPerson: lead.contactPerson || "",
              status: "planned" as const,
              errorMessage: "",
              createdAt: new Date().toISOString(),
            },
          };
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Bulk-Mail konnte nicht generiert werden.";
          updateBulkLead(lead.id, { sendStatus: "error" });
          return {
            lead,
            generated: null,
            packageMail: {
              id: crypto.randomUUID(),
              leadId: lead.id,
              company: lead.company,
              recipientEmail: lead.email,
              phone: lead.phone || "",
              subject: "",
              textBlockTitles,
              contactPerson: lead.contactPerson || "",
              status: "failed" as const,
              errorMessage: message,
              createdAt: new Date().toISOString(),
            },
          };
        }
      })
    );

    const createResponse = await fetch("/api/crm/bulk-packages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: packageId,
        createdAt: new Date().toISOString(),
        searchLocation: bulkLocation.trim(),
        radiusKm: bulkRadius,
        textBlockTitles,
        shortMode: bulkShortMode,
        testMode: bulkTestMode,
        mails: generatedEntries.map((entry) => entry.packageMail),
      }),
    });
    const createData = await createResponse.json();

    if (!createResponse.ok || !createData.package) {
      leadsToSend.forEach((lead) => updateBulkLead(lead.id, { sendStatus: "error" }));
      setError(createData.error || "Streumail-Paket konnte nicht vorbereitet werden.");
      return;
    }

    replaceBulkPackageInState(createData.package as BulkPackageRecord);
    setSelectedBulkPackageId(packageId);

    const sendableEntries = generatedEntries.filter(
      (entry): entry is typeof entry & { generated: { subject: string; text: string } } =>
        Boolean(entry.generated)
    );
    const failedBeforeSend = generatedEntries.length - sendableEntries.length;
    let sentCount = 0;

    for (const entry of sendableEntries) {
      await updatePackageMailStatus(packageId, entry.packageMail.id, "sending", {
        subject: entry.generated.subject,
      });
      try {
        const sendResponse = await fetch("/api/send-bulk-mail", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: entry.lead.email,
            subject: entry.generated.subject,
            text: entry.generated.text,
            testMode: bulkTestMode,
            sendCopy: true,
            company: entry.lead.company,
            contactPerson: entry.lead.contactPerson,
            phone: entry.lead.phone || "",
            website: entry.lead.website || "",
            city: entry.lead.city || "",
            industry: entry.lead.industry || "",
            hookText: textBlockTitles.join(", ") || entry.generated.subject,
            textBlockTitles,
            shortMode: bulkShortMode,
            batchId: packageId,
            packageMailId: entry.packageMail.id,
            searchLocation: bulkLocation.trim(),
            radiusKm: bulkRadius,
          }),
        });
        const sendData = await sendResponse.json();
        if (!sendResponse.ok) {
          updateBulkLead(entry.lead.id, { sendStatus: "error" });
          await updatePackageMailStatus(packageId, entry.packageMail.id, "failed", {
            subject: entry.generated.subject,
            errorMessage: sendData.error || "Streumail konnte nicht gesendet werden.",
          });
          continue;
        }
        updateBulkLead(entry.lead.id, { sendStatus: "sent" });
        sentCount += 1;
      } catch {
        updateBulkLead(entry.lead.id, { sendStatus: "error" });
        await updatePackageMailStatus(packageId, entry.packageMail.id, "failed", {
          subject: entry.generated.subject,
          errorMessage: "Streumail konnte nicht gesendet werden.",
        });
      }
    }

    await loadHistory();

    if (sentCount > 0) {
      setSuccessMessage(
        bulkTestMode
          ? `${sentCount} Streumails wurden als Test versendet.`
          : `${sentCount} Streumails wurden versendet.`
      );
    }
    if (failedBeforeSend > 0 || sentCount !== leadsToSend.length) {
      setError("Das Paket wurde vollstaendig vorbereitet, aber einzelne Mails konnten nicht gesendet werden.");
    }
  }

  async function handleSendBulkLead(id: string) {
    const lead = bulkLeads.find((item) => item.id === id);
    if (!lead || !lead.email) {
      setError("Fuer dieses Unternehmen wurde noch keine E-Mail-Adresse gefunden.");
      return;
    }
    await handleSendBulkBatch([id]);
  }

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
      setError("Bitte Titel und Text fuer den Baustein ausfuellen.");
      return;
    }
    setBulkTextBlocks((prev) => {
      const exists = prev.some((item) => item.id === editingBulkTextBlock.id);
      if (exists) {
        return prev.map((item) =>
          item.id === editingBulkTextBlock.id ? { ...editingBulkTextBlock, title, text } : item
        );
      }
      return [...prev, { ...editingBulkTextBlock, title, text }];
    });
    setActiveBulkTextBlockIds((prev) =>
      prev.includes(editingBulkTextBlock.id) ? prev : [...prev, editingBulkTextBlock.id]
    );
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
    setActiveBulkTextBlockIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  // ---- Render ----

  return (
    <>
      {/* Tab Navigation */}
      <div style={{ marginBottom: "18px", display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
        <button type="button" onClick={() => setMainView("mails")} style={topMenuButtonStyle(mainView === "mails")}>
          Kaltakquise-Mails
        </button>
        <button type="button" onClick={() => setMainView("bulk")} style={topMenuButtonStyle(mainView === "bulk")}>
          Streumail
        </button>
        <button type="button" onClick={() => setMainView("reminders")} style={topMenuButtonStyle(mainView === "reminders")}>
          Erinnerungen
        </button>
        <button type="button" onClick={() => setMainView("analytics")} style={topMenuButtonStyle(mainView === "analytics")}>
          Texte &amp; Auswertungen
        </button>
      </div>

      <div style={{ display: "flex", gap: "24px", alignItems: "flex-start", flexDirection: isMobile ? "column" : "row", width: "100%" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {error ? <div style={{ marginBottom: "18px", color: "#b91c1c", fontWeight: 600 }}>{error}</div> : null}
          {successMessage ? <div style={{ marginBottom: "18px", color: "#166534", fontWeight: 600 }}>{successMessage}</div> : null}

          {/* ---- Kaltakquise-Mails ---- */}
          {mainView === "mails" && (
            <div style={{ background: "#ffffff", border: "1px solid #d1d5db", borderRadius: "14px", padding: "20px", width: "100%", boxSizing: "border-box" }}>
              <h1 style={{ marginTop: 0, marginBottom: "18px", fontSize: "18px" }}>Kaltakquise-Mails</h1>

              <div style={{ marginBottom: "22px", paddingBottom: "18px", borderBottom: "1px solid #e5e7eb" }}>
                <div style={{ fontSize: "16px", fontWeight: 700, marginBottom: "14px" }}>1. Quelle analysieren</div>

                {!isMobile && (
                  <Field label="Anzeigen-URL" value={jobUrl} onChange={setJobUrl} placeholder="https://..." />
                )}

                <div style={{ marginTop: !isMobile ? "4px" : 0 }}>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}>
                    {isMobile ? "Datei, Foto oder URL" : "Datei"}
                  </label>
                  <div style={{ display: "flex", gap: "10px", marginBottom: "12px", flexWrap: "wrap" }}>
                    <label style={uploadLabelStyle}>
                      📁 Datei
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                        style={{ display: "none" }}
                      />
                    </label>
                    {isMobile && (
                      <label style={uploadLabelStyle}>
                        📷 Foto
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                          style={{ display: "none" }}
                        />
                      </label>
                    )}
                    {isMobile && (
                      <button
                        type="button"
                        onClick={handlePasteUrl}
                        style={{ ...uploadLabelStyle, border: "1px solid #cbd5e1", fontSize: "14px" }}
                      >
                        🔗 URL einfuegen
                      </button>
                    )}
                  </div>
                  {isMobile && jobUrl.trim() && (
                    <div style={{ marginBottom: "12px", fontSize: "13px", color: "#374151", wordBreak: "break-all" }}>
                      URL: {jobUrl}
                    </div>
                  )}
                  {selectedFile && (
                    <div style={{ marginBottom: "12px", fontSize: "14px", color: "#374151", wordBreak: "break-word" }}>
                      Ausgewaehlt: {selectedFile.name}
                    </div>
                  )}
                </div>

                <button onClick={handleAnalyzeSource} disabled={analyzingSource} style={primaryButtonStyle(analyzingSource)}>
                  {analyzingSource ? "Wird analysiert..." : "Quelle analysieren"}
                </button>
              </div>

              <div style={{ display: "grid", gap: "16px", marginBottom: "24px" }}>
                <FieldWithOptions
                  label="Jobtitel"
                  value={jobData.jobTitle}
                  onChange={(value) => setFieldValue("jobTitle", value)}
                  options={jobData.jobTitleOptions}
                  onSelectOption={(value) => setFieldValue("jobTitle", value)}
                />
                <FieldWithOptions
                  label="Firma"
                  value={jobData.company}
                  onChange={(value) => setFieldValue("company", value)}
                  options={jobData.companyOptions}
                  onSelectOption={(value) => setFieldValue("company", value)}
                />
                <FieldWithOptions
                  label="Ansprechpartner"
                  value={jobData.contactPerson}
                  onChange={(value) => setFieldValue("contactPerson", value)}
                  options={jobData.contactPersonOptions}
                  onSelectOption={(value) => setFieldValue("contactPerson", value)}
                />
                <FieldWithOptions
                  label="Email"
                  value={jobData.email}
                  onChange={(value) => setFieldValue("email", value)}
                  options={jobData.emailOptions}
                  onSelectOption={(value) => setFieldValue("email", value)}
                />
              </div>

              <div style={{ marginBottom: "22px", paddingTop: "2px", paddingBottom: "18px", borderBottom: "1px solid #e5e7eb" }}>
                <div style={{ fontSize: "16px", fontWeight: 700, marginBottom: "14px" }}>2. Email gestalten</div>

                <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", alignItems: "flex-start", flexWrap: "wrap", marginBottom: "16px" }}>
                  <div style={{ flex: 1, minWidth: "280px" }}>
                    <div style={{ marginBottom: "8px", fontWeight: 600 }}>Hinweise</div>
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                      {HINT_OPTIONS.map((option) => {
                        const active = selectedHints.includes(option.key);
                        return (
                          <button
                            key={option.key}
                            type="button"
                            onClick={() => toggleHint(option.key)}
                            style={{
                              padding: "8px 12px",
                              border: "1px solid #cbd5e1",
                              borderRadius: "999px",
                              background: active ? "#111827" : "#ffffff",
                              color: active ? "#ffffff" : "#111827",
                              cursor: "pointer",
                              fontSize: "14px",
                            }}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ minWidth: "220px" }}>
                    <label style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}>Einstieg</label>
                    <select
                      value={selectedHookBaseId}
                      onChange={(e) => setSelectedHookBaseId(e.target.value as HookBaseId)}
                      style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", background: "#ffffff", fontSize: "14px", boxSizing: "border-box" }}
                    >
                      {HOOK_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button onClick={handleGenerateEmail} disabled={generatingEmail || !hasAnalyzedSource} style={primaryButtonStyle(generatingEmail || !hasAnalyzedSource)}>
                  {generatingEmail ? "Wird generiert..." : "Email generieren"}
                </button>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}>Generierte E-Mail</label>
                <textarea
                  value={jobData.generatedEmail}
                  onChange={(e) => setJobData((prev) => ({ ...prev, generatedEmail: e.target.value }))}
                  rows={16}
                  style={{ width: "100%", padding: "12px", border: "1px solid #cbd5e1", borderRadius: "8px", background: "#ffffff", fontSize: "15px", boxSizing: "border-box", resize: "vertical", fontFamily: "Arial, sans-serif", lineHeight: 1.5 }}
                />
              </div>

              {jobData.hookBaseLabel && (
                <div style={{ marginTop: "-6px", marginBottom: "16px", fontSize: "13px", color: "#6b7280" }}>
                  Verwendeter Einstieg: {jobData.hookBaseLabel}
                  {jobData.hookVariantId ? ` · ${jobData.hookVariantId}` : ""}
                </div>
              )}

              <div style={{ marginBottom: "2px" }}>
                <label style={{ fontSize: "14px", cursor: "pointer" }}>
                  <input type="checkbox" checked={testMode} onChange={(e) => setTestMode(e.target.checked)} style={{ marginRight: "6px" }} />
                  Test an mich senden
                </label>
              </div>
              <div style={{ marginBottom: "2px" }}>
                <label style={{ fontSize: "14px", cursor: "pointer" }}>
                  <input type="checkbox" checked={sendCopy} onChange={(e) => setSendCopy(e.target.checked)} style={{ marginRight: "6px" }} />
                  Kopie an mich senden
                </label>
              </div>
              <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "18px" }}>
                {testMode ? "Versand geht an deine Testadresse." : "Versand geht an die erkannte Unternehmens-E-Mail."}
              </div>

              <button onClick={handleSendEmail} disabled={sendingEmail} style={primaryButtonStyle(sendingEmail)}>
                {sendingEmail ? "Wird gesendet..." : "Email senden"}
              </button>
            </div>
          )}

          {/* ---- Streumail ---- */}
          {mainView === "bulk" && (
            <div style={{ background: "#ffffff", border: "1px solid #d1d5db", borderRadius: "14px", padding: "20px", boxSizing: "border-box" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", alignItems: "flex-start", flexWrap: "wrap", marginBottom: "18px" }}>
                <div style={{ fontSize: "18px", fontWeight: 700 }}>Streumails</div>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center", justifyContent: "flex-end" }}>
                  {bulkTextBlocks.map((block) => {
                    const active = activeBulkTextBlockIds.includes(block.id);
                    return (
                      <div key={block.id} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 10px", border: "1px solid #cbd5e1", borderRadius: "999px", background: active ? "#111827" : "#ffffff", color: active ? "#ffffff" : "#111827" }}>
                        <button type="button" onClick={() => toggleBulkTextBlock(block.id)} style={{ border: "none", background: "transparent", color: "inherit", cursor: "pointer", padding: 0, fontSize: "12px", fontWeight: 600 }}>{block.title}</button>
                        <button type="button" onClick={() => openBulkTextBlockEditor(block)} style={{ border: "none", background: "transparent", color: "inherit", cursor: "pointer", padding: 0, fontSize: "12px" }}>Edit</button>
                      </div>
                    );
                  })}
                  <button type="button" onClick={openNewBulkTextBlockEditor} style={smallButtonStyle(false)}>+ Baustein</button>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(180px, 1.1fr) minmax(180px, 1fr) 140px 140px minmax(220px, auto)", gap: "12px", alignItems: "end", marginBottom: "18px" }}>
                <Field label="PLZ oder Ort" value={bulkLocation} onChange={setBulkLocation} placeholder="z. B. Potsdam oder 14467" />
                <Field label="Besonderheiten / Fokus" value={bulkFocus} onChange={setBulkFocus} placeholder="z. B. Arzt, Pflege, Handwerk, kleinere Unternehmen" />
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}>Radius</label>
                  <select value={bulkRadius} onChange={(e) => setBulkRadius(e.target.value)} style={selectStyle}>
                    <option value="15">15 km</option>
                    <option value="30">30 km</option>
                    <option value="50">50 km</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}>Kontakte</label>
                  <select value={bulkCount} onChange={(e) => setBulkCount(e.target.value)} style={selectStyle}>
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="30">30</option>
                  </select>
                </div>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: isMobile ? "stretch" : "flex-start" }}>
                  <button type="button" onClick={() => void handleFindBulkLeads()} disabled={findingBulkLeads} style={primaryButtonStyle(findingBulkLeads)}>
                    {findingBulkLeads ? "Wird gesucht..." : "Liste finden"}
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", gap: "18px", flexWrap: "wrap", alignItems: "center", marginBottom: "18px" }}>
                <label style={{ fontSize: "14px", cursor: "pointer" }}>
                  <input type="checkbox" checked={bulkTestMode} onChange={(e) => setBulkTestMode(e.target.checked)} style={{ marginRight: "6px" }} />
                  Testmodus
                </label>
                <label style={{ fontSize: "14px", cursor: "pointer" }}>
                  <input type="checkbox" checked={bulkShortMode} onChange={(e) => setBulkShortMode(e.target.checked)} style={{ marginRight: "6px" }} />
                  Kurze Mail
                </label>
                <label style={{ fontSize: "14px", cursor: "pointer" }}>
                  <input type="checkbox" checked={bulkOnlyNewContacts} onChange={(e) => setBulkOnlyNewContacts(e.target.checked)} style={{ marginRight: "6px" }} />
                  Nur neue Kontakte
                </label>
                <div style={{ fontSize: "13px", color: "#6b7280" }}>
                  {bulkTestMode ? "Bulk-Versand geht nur an TEST_RECIPIENT_EMAIL." : "Produktivversand an gelistete Empfaenger aktiv."}
                </div>
              </div>

              {bulkLeads.length === 0 ? (
                <div style={{ fontSize: "14px", color: "#6b7280" }}>Noch keine Firmenliste geladen.</div>
              ) : (
                <BulkLeadsTableReplacementV4
                  leads={bulkLeads}
                  onToggleSelected={(id, selected) => updateBulkLead(id, { selected })}
                  onSetAllSelected={setAllBulkLeadsSelected}
                  onAnalyzeOne={handleAnalyzeBulkLead}
                  onCollectOne={handleCollectBulkData}
                  onQualityOne={handleAssessBulkQuality}
                  onSendOne={handleSendBulkLead}
                  onSendBatch={handleSendBulkBatch}
                  onChooseEmail={chooseLeadEmail}
                  onChooseContactPerson={chooseLeadContactPerson}
                />
              )}
            </div>
          )}

          {/* ---- Erinnerungen ---- */}
          {mainView === "reminders" && (
            <div style={{ background: "#ffffff", border: "1px solid #d1d5db", borderRadius: "14px", padding: "20px", boxSizing: "border-box" }}>
              <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "18px" }}>Erinnerungen</div>

              {visibleReminders.length === 0 ? (
                <div style={{ fontSize: "14px", color: "#6b7280" }}>Aktuell sind keine offenen Erinnerungen vorhanden.</div>
              ) : (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center", marginBottom: "16px", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => setRemindersCollapsed((prev) => !prev)}
                      style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer", fontWeight: 700, fontSize: "14px", color: "#111827" }}
                    >
                      {remindersCollapsed ? "▶" : "▼"} Offene Erinnerungen
                    </button>
                    <button
                      type="button"
                      onClick={handleSendAllReminders}
                      disabled={sendingAllReminders || visibleReminders.length === 0}
                      style={{
                        padding: "8px 12px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        background: "#111827",
                        color: "#ffffff",
                        cursor: sendingAllReminders || visibleReminders.length === 0 ? "not-allowed" : "pointer",
                        fontSize: "12px",
                        opacity: sendingAllReminders || visibleReminders.length === 0 ? 0.7 : 1,
                      }}
                    >
                      {sendingAllReminders ? "Wird gesendet..." : "Alle Erinnerungen abschicken"}
                    </button>
                  </div>

                  {!remindersCollapsed && (
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                      {visibleReminders.map((item) => {
                        const isCompleted = completedReminders.includes(item.id);
                        const isSending = sendingReminderId === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            title={displayMailTitle(item)}
                            onClick={() => handleReminderQuickSend(item)}
                            disabled={isSending || isCompleted}
                            style={{
                              width: isMobile ? "100%" : "24%",
                              minWidth: isMobile ? "100%" : "240px",
                              padding: "10px 12px",
                              borderRadius: "10px",
                              background: isCompleted ? "#dcfce7" : "#f9fafb",
                              border: isCompleted ? "1px solid #86efac" : "1px solid #e5e7eb",
                              cursor: isSending || isCompleted ? "default" : "pointer",
                              lineHeight: 1.2,
                              textAlign: "left",
                              opacity: isSending ? 0.7 : 1,
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                              <div style={{ fontSize: "13px", fontWeight: 600, lineHeight: 1.25, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", minHeight: "34px", flex: 1 }}>
                                {displayMailTitle(item)}
                              </div>
                              {!isCompleted && !isSending && (
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); dismissReminder(item.id); }}
                                  title="Reminder ausblenden"
                                  style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: "14px", color: "#6b7280", padding: 0, lineHeight: 1 }}
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                            <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "6px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {item.company?.trim() || item.recipientLabel || item.recipientEmail}
                            </div>
                            <div style={{ marginTop: "8px", fontSize: "11px", color: isCompleted ? "#166534" : "#6b7280" }}>
                              {isCompleted ? "Test gesendet" : "3 Std. nach 1. Mail"}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ---- Analytics ---- */}
          {mainView === "analytics" && (
            <div style={{ background: "#ffffff", border: "1px solid #d1d5db", borderRadius: "14px", padding: "20px", boxSizing: "border-box" }}>
              <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "18px" }}>Texte &amp; Auswertungen</div>

              {loadingTextStats ? (
                <div style={{ fontSize: "14px", color: "#6b7280" }}>Auswertungen werden geladen...</div>
              ) : textStats.length === 0 ? (
                <div style={{ fontSize: "14px", color: "#6b7280" }}>Noch keine Textdaten vorhanden.</div>
              ) : (
                <>
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "20px" }}>
                    {textStats.map((hook) => {
                      const active = selectedAnalyticsHookId === hook.hookBaseId;
                      return (
                        <button
                          key={hook.hookBaseId}
                          type="button"
                          onClick={() => setSelectedAnalyticsHookId(hook.hookBaseId)}
                          style={{ padding: "10px 14px", borderRadius: "999px", border: "1px solid #cbd5e1", background: active ? "#111827" : "#ffffff", color: active ? "#ffffff" : "#111827", cursor: "pointer", fontSize: "14px", fontWeight: 600 }}
                        >
                          {hook.hookBaseLabel}
                        </button>
                      );
                    })}
                  </div>

                  {selectedHookStats && (
                    <>
                      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(5, minmax(0, 1fr))", gap: "12px", marginBottom: "20px" }}>
                        <StatCard label="Gesendet" value={String(selectedHookStats.sent)} />
                        <StatCard label="Geoeffnet" value={String(selectedHookStats.opened)} />
                        <StatCard label="Oeffnungsrate" value={formatPercent(selectedHookStats.openRate)} />
                        <StatCard label="Reminder-Quote" value={formatPercent(selectedHookStats.reminderRate)} />
                        <StatCard label="Beste Variante" value={selectedHookStats.bestVariantId || "-"} subValue={formatPercent(selectedHookStats.bestVariantOpenRate)} />
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.1fr 1fr", gap: "20px", marginBottom: "24px" }}>
                        <div style={{ border: "1px solid #e5e7eb", borderRadius: "12px", padding: "16px" }}>
                          <div style={{ fontWeight: 700, marginBottom: "14px" }}>Kennzahlen</div>
                          <StatBar label="Oeffnungsrate" value={selectedHookStats.openRate} />
                          <StatBar label="Reminder-Quote" value={selectedHookStats.reminderRate} />
                          <StatBar label="Beste Variantenrate" value={selectedHookStats.bestVariantOpenRate} />
                        </div>
                        <div style={{ border: "1px solid #e5e7eb", borderRadius: "12px", padding: "16px" }}>
                          <div style={{ fontWeight: 700, marginBottom: "10px" }}>Hook-Ueberblick</div>
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
                            <thead>
                              <tr style={{ background: "#f9fafb", textAlign: "left" }}>
                                <th style={tableHeadStyle}>Variante</th>
                                <th style={tableHeadStyle}>Gesendet</th>
                                <th style={tableHeadStyle}>Geoeffnet</th>
                                <th style={tableHeadStyle}>Oeffnungsrate</th>
                                <th style={tableHeadStyle}>Reminder-Quote</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedHookStats.variants.map((variant) => (
                                <tr key={variant.hookVariantId}>
                                  <td style={tableCellStyle}>
                                    <div style={{ fontWeight: 600, marginBottom: "4px" }}>{variant.hookVariantId}</div>
                                    <div style={{ fontSize: "12px", color: "#6b7280", lineHeight: 1.4 }}>{variant.hookText}</div>
                                  </td>
                                  <td style={tableCellStyle}>{variant.sent}</td>
                                  <td style={tableCellStyle}>{variant.opened}</td>
                                  <td style={tableCellStyle}>{formatPercent(variant.openRate)}</td>
                                  <td style={tableCellStyle}>{formatPercent(variant.reminderRate)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* ---- Sidebar ---- */}
        {mainView === "bulk" ? (
          /* Streumail: Historie sidebar */
          <div style={{ width: isMobile ? "100%" : "340px", minWidth: isMobile ? "100%" : "340px", background: "#ffffff", border: "1px solid #d1d5db", borderRadius: "14px", padding: "16px", boxSizing: "border-box", position: isMobile ? "static" : "sticky", top: "20px" }}>
            <div style={{ fontWeight: 700, fontSize: "16px", marginBottom: "12px" }}>Historie</div>
            {loadingHistory ? (
              <div style={{ fontSize: "13px", color: "#6b7280" }}>Historie wird geladen...</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: isMobile ? "none" : "70vh", overflowY: "auto", paddingRight: "2px" }}>
                {bulkPackages.length === 0 ? (
                  <div style={{ fontSize: "13px", color: "#6b7280" }}>Noch keine passenden Eintraege vorhanden.</div>
                ) : (
                  bulkPackages.map((item) => (
                    <button key={item.id} type="button" onClick={() => setSelectedBulkPackageId(item.id)} style={{ textAlign: "left", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "10px", background: "#ffffff", cursor: "pointer" }}>
                      <div style={{ fontWeight: 600, fontSize: "13px", marginBottom: "4px", lineHeight: 1.3 }}>{item.label}</div>
                      <div style={{ fontSize: "12px", color: "#374151", marginBottom: "4px" }}>
                        {item.searchLocation ? `PLZ/Ort ${item.searchLocation}` : "PLZ/Ort -"}
                      </div>
                      <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "4px" }}>
                        {item.radiusKm ? `Umkreis ${item.radiusKm} km` : "Umkreis -"}
                      </div>
                      <div style={{ fontSize: "11px", color: "#6b7280" }}>{item.plannedCount} E-Mails</div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        ) : (
          /* Kaltakquise / Reminders / Analytics: CRM sidebar */
          <div style={{ width: isMobile ? "100%" : "340px", minWidth: isMobile ? "100%" : "340px", background: "#ffffff", border: "1px solid #d1d5db", borderRadius: "14px", padding: "16px", boxSizing: "border-box", position: isMobile ? "static" : "sticky", top: "20px" }}>
            <div style={{ fontWeight: 700, fontSize: "16px", marginBottom: "12px" }}>CRM</div>

            <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
              <button
                type="button"
                onClick={() => setCrmView("company")}
                style={{ flex: 1, padding: "8px 10px", borderRadius: "8px", border: "1px solid #cbd5e1", background: crmView === "company" ? "#111827" : "#ffffff", color: crmView === "company" ? "#ffffff" : "#111827", cursor: "pointer", fontSize: "13px" }}
              >
                Dieses Unternehmen
              </button>
              <button
                type="button"
                onClick={() => setCrmView("all")}
                style={{ flex: 1, padding: "8px 10px", borderRadius: "8px", border: "1px solid #cbd5e1", background: crmView === "all" ? "#111827" : "#ffffff", color: crmView === "all" ? "#ffffff" : "#111827", cursor: "pointer", fontSize: "13px" }}
              >
                Alle Emails
              </button>
            </div>

            {loadingCrm ? (
              <div style={{ fontSize: "13px", color: "#6b7280" }}>CRM wird geladen...</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: isMobile ? "none" : "70vh", overflowY: "auto", paddingRight: "2px" }}>
                {crmHistory.length === 0 ? (
                  <div style={{ fontSize: "13px", color: "#6b7280" }}>Noch keine passenden Eintraege vorhanden.</div>
                ) : (
                  crmHistory.map((mail) => (
                    <button
                      key={mail.id}
                      type="button"
                      onClick={() => handleOpenMailDetail(mail)}
                      style={{ textAlign: "left", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "10px", background: "#ffffff", cursor: "pointer" }}
                    >
                      <div style={{ fontWeight: 600, fontSize: "13px", marginBottom: "4px", lineHeight: 1.3, wordBreak: "break-word" }}>
                        {displayMailTitle(mail)}
                      </div>
                      <div style={{ fontSize: "12px", color: "#374151", marginBottom: "4px", wordBreak: "break-word", lineHeight: 1.3 }}>
                        {mail.company?.trim() || mail.recipientLabel || mail.recipientEmail}
                      </div>
                      {mail.reminded && (
                        <div style={{ fontSize: "11px", color: "#166534", fontWeight: 600, marginBottom: "4px" }}>
                          Erinnerung gesendet{mail.reminderSentAt ? ` · ${formatDate(mail.reminderSentAt)}` : ""}
                        </div>
                      )}
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "center" }}>
                        <div style={{ fontSize: "11px", color: "#6b7280" }}>{formatDate(mail.createdAt)}</div>
                        <div style={{ fontSize: "11px", fontWeight: 600, color: statusColor(mail.status) }}>
                          {mail.lastEvent || statusLabel(mail.status)}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ---- Mail detail popup ---- */}
      {selectedMail && (
        <div
          onClick={() => { setSelectedMail(null); setSelectedMailDetail(null); }}
          style={{ position: "fixed", inset: 0, background: "rgba(17, 24, 39, 0.45)", zIndex: 50, padding: "24px", overflowY: "auto" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "720px", margin: "40px auto", background: "#ffffff", borderRadius: "14px", padding: "20px", boxSizing: "border-box" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", alignItems: "flex-start", marginBottom: "16px" }}>
              <div>
                <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "4px" }}>{displayMailTitle(selectedMail)}</div>
                <div style={{ color: "#374151", fontSize: "14px" }}>
                  {selectedMail.company?.trim() || selectedMail.recipientLabel || selectedMail.recipientEmail}
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setSelectedMail(null); setSelectedMailDetail(null); }}
                style={{ border: "1px solid #cbd5e1", background: "#ffffff", borderRadius: "8px", padding: "6px 10px", cursor: "pointer" }}
              >
                Schliessen
              </button>
            </div>

            {loadingDetail ? (
              <div style={{ fontSize: "14px", color: "#6b7280" }}>Details werden geladen...</div>
            ) : selectedMailDetail ? (
              <>
                <div style={{ display: "grid", gap: "10px", marginBottom: "16px", fontSize: "14px" }}>
                  <DetailRow label="Von" value={selectedMailDetail.from || "-"} />
                  <DetailRow label="Empfaenger" value={(selectedMailDetail.to || []).join(", ") || "-"} />
                  <DetailRow label="Datum" value={formatDate(selectedMailDetail.createdAt)} />
                  <DetailRow label="Status" value={selectedMailDetail.lastEvent || "-"} />
                  <DetailRow label="Betreff" value={selectedMailDetail.subject || "-"} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: "8px" }}>Mailtext</div>
                  <div style={{ whiteSpace: "pre-wrap", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "12px", fontSize: "14px", lineHeight: 1.5, maxHeight: "400px", overflowY: "auto" }}>
                    {selectedMailDetail.text || "Kein Plain-Text vorhanden. HTML liegt vor."}
                  </div>
                </div>
              </>
            ) : (
              <div style={{ fontSize: "14px", color: "#6b7280" }}>Keine Details geladen.</div>
            )}
          </div>
        </div>
      )}

      {/* ---- Textbaustein editor ---- */}
      {bulkEditorOpen && editingBulkTextBlock ? (
        <div style={{ position: "fixed", inset: 0, background: "rgba(17, 24, 39, 0.25)", zIndex: 55, padding: "24px" }} onClick={() => setBulkEditorOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: "520px", margin: "60px auto", background: "#ffffff", borderRadius: "14px", padding: "20px", boxSizing: "border-box", border: "1px solid #e5e7eb" }}>
            <div style={{ fontSize: "16px", fontWeight: 700, marginBottom: "14px" }}>Textbaustein bearbeiten</div>
            <Field label="Badge-Titel" value={editingBulkTextBlock.title} onChange={(value) => setEditingBulkTextBlock((prev) => (prev ? { ...prev, title: value } : prev))} placeholder="z. B. Aktion XY" />
            <div style={{ marginBottom: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center", marginBottom: "8px", flexWrap: "wrap" }}>
                <label style={{ display: "block", fontWeight: 600 }}>Textbaustein</label>
                <button
                  type="button"
                  onClick={() => setEditingBulkTextBlock((prev) => prev ? { ...prev, text: insertLinkTemplate(prev.text) } : prev)}
                  style={smallButtonStyle(false)}
                >
                  Link einfuegen
                </button>
              </div>
              <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "8px" }}>
                Verlinkung im Baustein mit Markdown-Syntax: `[Linktext](https://example.de)`
              </div>
              <textarea
                value={editingBulkTextBlock.text}
                onChange={(e) => setEditingBulkTextBlock((prev) => (prev ? { ...prev, text: e.target.value } : prev))}
                rows={6}
                style={{ width: "100%", padding: "12px", border: "1px solid #cbd5e1", borderRadius: "8px", background: "#ffffff", fontSize: "14px", boxSizing: "border-box", resize: "vertical", lineHeight: 1.5 }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center" }}>
              <div>
                {bulkTextBlocks.some((item) => item.id === editingBulkTextBlock.id) ? (
                  <button type="button" onClick={() => deleteBulkTextBlock(editingBulkTextBlock.id)} style={{ ...smallButtonStyle(false), borderColor: "#fca5a5", color: "#b91c1c" }}>
                    Loeschen
                  </button>
                ) : null}
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button type="button" onClick={() => setBulkEditorOpen(false)} style={smallButtonStyle(false)}>Abbrechen</button>
                <button type="button" onClick={saveBulkTextBlock} style={primaryButtonStyle(false)}>Speichern</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ---- Bulk package detail popup ---- */}
      {selectedBulkPackage ? (
        <div onClick={() => setSelectedBulkPackageId(null)} style={{ position: "fixed", inset: 0, background: "rgba(17, 24, 39, 0.45)", zIndex: 50, padding: "24px", overflowY: "auto" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: "720px", margin: "40px auto", background: "#ffffff", borderRadius: "14px", padding: "20px", boxSizing: "border-box" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", alignItems: "flex-start", marginBottom: "16px" }}>
              <div>
                <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "4px" }}>{selectedBulkPackage.label}</div>
                <div style={{ color: "#374151", fontSize: "14px" }}>{selectedBulkPackage.plannedCount} Firmen im Paket</div>
              </div>
              <button type="button" onClick={() => setSelectedBulkPackageId(null)} style={{ border: "1px solid #cbd5e1", background: "#ffffff", borderRadius: "8px", padding: "6px 10px", cursor: "pointer" }}>Schliessen</button>
            </div>

            <div style={{ display: "grid", gap: "10px", marginBottom: "16px", fontSize: "14px" }}>
              <DetailRow label="PLZ / Ort" value={selectedBulkPackage.searchLocation || "-"} />
              <DetailRow label="Umkreis" value={selectedBulkPackage.radiusKm ? `${selectedBulkPackage.radiusKm} km` : "-"} />
              <DetailRow label="Versandzeit" value={formatDate(selectedBulkPackage.createdAt)} />
              <DetailRow label="Geplant" value={`${selectedBulkPackage.plannedCount} E-Mails`} />
              <DetailRow label="Bausteine" value={selectedBulkPackage.textBlockTitles.length > 0 ? selectedBulkPackage.textBlockTitles.join(", ") : "-"} />
              <DetailRow label="Kurzmodus" value={selectedBulkPackage.shortMode ? "Ja" : "Nein"} />
              <DetailRow label="Testmodus" value={selectedBulkPackage.testMode ? "Ja" : "Nein"} />
            </div>

            <div style={{ border: "1px solid #e5e7eb", borderRadius: "12px", overflow: "hidden" }}>
              <div style={{ padding: "14px 16px", borderBottom: "1px solid #e5e7eb", fontWeight: 700 }}>Empfaenger im Paket</div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                  <thead>
                    <tr style={{ background: "#f9fafb", textAlign: "left" }}>
                      <th style={tableHeadStyle}>Firma</th>
                      <th style={tableHeadStyle}>Empfaenger</th>
                      <th style={tableHeadStyle}>Telefon</th>
                      <th style={tableHeadStyle}>Bausteine</th>
                      <th style={tableHeadStyle}>Betreff</th>
                      <th style={tableHeadStyle}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedBulkPackage.mails.map((mail) => (
                      <tr key={mail.id}>
                        <td style={tableCellStyle}>{mail.company || "-"}</td>
                        <td style={tableCellStyle}>{mail.recipientEmail || "-"}</td>
                        <td style={tableCellStyle}>{mail.phone || "-"}</td>
                        <td style={tableCellStyle}>{mail.textBlockTitles?.join(", ") || "-"}</td>
                        <td style={tableCellStyle}>{mail.subject || "-"}</td>
                        <td style={tableCellStyle}>
                          <div>{packageStatusLabel(mail.status)}</div>
                          {mail.errorMessage ? (
                            <div style={{ marginTop: "4px", fontSize: "12px", color: "#b91c1c" }}>{mail.errorMessage}</div>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
