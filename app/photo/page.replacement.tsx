"use client";

import { useEffect, useMemo, useState } from "react";
import BulkLeadsTableNext, { type BulkLead } from "./BulkLeadsTable.next";

type HintKey =
  | "multiple-jobs"
  | "social-media"
  | "print"
  | "multiposting";

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
  domain: string;
  text: string;
  status: "sent" | "test" | "failed" | "draft";
  createdAt: string;
  lastEvent?: string;
  reminderLabel?: string;
  reminded?: boolean;
  reminderSentAt?: string;
  reminderSubject?: string;
  kind?: "single" | "bulk";
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

function getDomain(email: string) {
  return email.split("@")[1]?.toLowerCase().trim() || "";
}

function normalizeCompany(company: string) {
  return company
    .toLowerCase()
    .replace(/\b(gmbh|mbh|ag|ug|kg|e\.v\.|ev)\b/g, "")
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

function statusLabel(status: MailRecord["status"]) {
  switch (status) {
    case "sent":
      return "Gesendet";
    case "test":
      return "Test";
    case "failed":
      return "Fehler";
    case "draft":
      return "Entwurf";
    default:
      return status;
  }
}

function statusColor(status: MailRecord["status"]) {
  switch (status) {
    case "sent":
      return "#166534";
    case "test":
      return "#1d4ed8";
    case "failed":
      return "#b91c1c";
    case "draft":
      return "#6b7280";
    default:
      return "#6b7280";
  }
}

function displayMailTitle(mail: Pick<MailRecord, "jobTitle" | "subject">) {
  return mail.jobTitle?.trim() || mail.subject || "Ohne Betreff";
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)} %`;
}

function StatBar({ value, label }: { value: number; label: string }) {
  const width = Math.max(0, Math.min(100, value * 100));

  return (
    <div style={{ marginBottom: "12px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "12px",
          marginBottom: "6px",
          fontSize: "13px",
        }}
      >
        <span>{label}</span>
        <span style={{ fontWeight: 600 }}>{formatPercent(value)}</span>
      </div>

      <div
        style={{
          height: "10px",
          background: "#e5e7eb",
          borderRadius: "999px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${width}%`,
            height: "100%",
            background: "#111827",
          }}
        />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  subValue,
}: {
  label: string;
  value: string;
  subValue?: string;
}) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: "12px",
        padding: "14px",
        background: "#ffffff",
      }}
    >
      <div
        style={{
          fontSize: "12px",
          color: "#6b7280",
          marginBottom: "6px",
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: "20px",
          fontWeight: 700,
          lineHeight: 1.2,
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>

      {subValue ? (
        <div
          style={{
            marginTop: "6px",
            fontSize: "12px",
            color: "#6b7280",
          }}
        >
          {subValue}
        </div>
      ) : null}
    </div>
  );
}

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
      <label
        style={{
          display: "block",
          marginBottom: "8px",
          fontWeight: 600,
        }}
      >
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
  const alternativeOptions = options.filter(
    (option) => option && option !== value
  );

  return (
    <div>
      <label
        style={{
          display: "block",
          marginBottom: "8px",
          fontWeight: 600,
        }}
      >
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
        <div
          style={{
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
            marginTop: "8px",
          }}
        >
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
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "120px 1fr",
        gap: "12px",
      }}
    >
      <div style={{ color: "#6b7280" }}>{label}</div>
      <div style={{ wordBreak: "break-word" }}>{value}</div>
    </div>
  );
}

const uploadLabelStyle: React.CSSProperties = {
  padding: "10px 14px",
  border: "1px solid #cbd5e1",
  borderRadius: "8px",
  background: "#ffffff",
  cursor: "pointer",
};

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

function buildMockBulkLeads(location: string, count: number): BulkLead[] {
  const baseNames = [
    "Pflegezentrum",
    "BauService",
    "Logistik Partner",
    "Sozialwerk",
    "Handwerk Team",
    "Kita Träger",
    "Steuerkanzlei",
    "Wohnverbund",
    "Klinikverbund",
    "Reha Zentrum",
    "Elektrotechnik",
    "Gastro Service",
    "Transport GmbH",
    "Stadtwerke",
    "Immobilienservice",
    "Seniorenresidenz",
    "Vereinsservice",
    "Bildungsträger",
    "Metallbau",
    "Reinigungsdienst",
    "Tiefbau",
    "Hausverwaltung",
    "Ingenieurbüro",
    "Malerbetrieb",
    "Autohaus",
    "Werkstattservice",
    "Sportverein",
    "Jugendhilfe",
    "Apothekenverbund",
    "Landschaftsbau",
  ];

  return Array.from({ length: count }).map((_, index) => {
    const name = baseNames[index % baseNames.length];
    const company = `${name} ${location} ${index + 1}`;

    return {
      id: crypto.randomUUID(),
      selected: true,
      company,
      city: location,
      website: `https://${normalizeCompany(company).replace(/\s+/g, "-")}.de`,
      analysisStatus: "idle",
      analysisStars: 0,
      analysisSummary: "",
      foundJobTitles: [],
      contactStatus: "idle",
      email: "",
      contactPerson: "",
      industry: "",
      qualityStatus: "idle",
      qualityStars: 0,
      qualitySummary: "",
      alreadyContacted: false,
      lastContactAt: "",
      sendStatus: "idle",
    };
  });
}

export default function PhotoToMailPage({
  serviceMode = "full",
}: {
  serviceMode?: "cold" | "full";
}) {
  const [mainView, setMainView] = useState<MainView>("mails");

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [jobUrl, setJobUrl] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  const [selectedHints, setSelectedHints] = useState<HintKey[]>([]);
  const [selectedHookBaseId, setSelectedHookBaseId] = useState<HookBaseId>("auto");

  const [analyzingSource, setAnalyzingSource] = useState(false);
  const [generatingEmail, setGeneratingEmail] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [loadingCrm, setLoadingCrm] = useState(false);
  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null);
  const [sendingAllReminders, setSendingAllReminders] = useState(false);

  const [testMode, setTestMode] = useState(true);
  const [sendCopy, setSendCopy] = useState(true);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [jobData, setJobData] = useState<JobData>(EMPTY_JOB_DATA);

  const [crmView, setCrmView] = useState<"company" | "all">("all");
  const [mailHistory, setMailHistory] = useState<MailRecord[]>([]);
  const [reminders, setReminders] = useState<MailRecord[]>([]);
  const [completedReminders, setCompletedReminders] = useState<string[]>([]);
  const [selectedMail, setSelectedMail] = useState<MailRecord | null>(null);
  const [selectedMailDetail, setSelectedMailDetail] = useState<MailDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [remindersCollapsed, setRemindersCollapsed] = useState(false);
  const [dismissedReminderIds, setDismissedReminderIds] = useState<string[]>([]);

  const [loadingTextStats, setLoadingTextStats] = useState(false);
  const [textStats, setTextStats] = useState<HookBaseStats[]>([]);
  const [selectedAnalyticsHookId, setSelectedAnalyticsHookId] = useState("");

  const [bulkLocation, setBulkLocation] = useState("");
  const [bulkRadius, setBulkRadius] = useState("30");
  const [bulkCount, setBulkCount] = useState("20");
  const [bulkLeads, setBulkLeads] = useState<BulkLead[]>(EMPTY_BULK_LEADS);
  const [findingBulkLeads, setFindingBulkLeads] = useState(false);

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
        if (Array.isArray(parsed)) {
          setDismissedReminderIds(parsed);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        "dismissedReminderIds",
        JSON.stringify(dismissedReminderIds)
      );
    } catch {
      // ignore
    }
  }, [dismissedReminderIds]);

  const currentDomain = useMemo(() => getDomain(jobData.email), [jobData.email]);
  const currentCompany = useMemo(() => normalizeCompany(jobData.company), [jobData.company]);

  const visibleReminders = useMemo(
    () =>
      reminders.filter(
        (item) =>
          item.kind !== "bulk" &&
          !completedReminders.includes(item.id) &&
          !dismissedReminderIds.includes(item.id)
      ),
    [reminders, completedReminders, dismissedReminderIds]
  );

  const selectedHookStats = useMemo(
    () => textStats.find((item) => item.hookBaseId === selectedAnalyticsHookId) || null,
    [textStats, selectedAnalyticsHookId]
  );

  function toggleHint(hint: HintKey) {
    setSelectedHints((prev) =>
      prev.includes(hint) ? prev.filter((item) => item !== hint) : [...prev, hint]
    );
  }

  function uniqueOptions(primary: string, options?: string[]) {
    const values = [primary, ...(options || [])]
      .map((v) => (v || "").trim())
      .filter(Boolean);

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

      const loadedEmails = Array.isArray(data.emails) ? data.emails : [];
      const loadedReminders = Array.isArray(data.reminders) ? data.reminders : [];

      setMailHistory(
        serviceMode === "cold"
          ? loadedEmails.filter((mail: MailRecord) => mail.kind !== "bulk")
          : loadedEmails
      );
      setReminders(
        serviceMode === "cold"
          ? loadedReminders.filter((mail: MailRecord) => mail.kind !== "bulk")
          : loadedReminders
      );

      const preCompleted = loadedEmails
        .filter((mail: MailRecord) => mail.reminded)
        .map((mail: MailRecord) => mail.id);

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

      const hooks = Array.isArray(data.hooks) ? data.hooks : [];
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

  useEffect(() => {
    loadCrm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crmView, currentDomain, currentCompany]);

  useEffect(() => {
    if (mainView === "analytics") {
      loadTextStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainView]);

  useEffect(() => {
    if (serviceMode === "cold" && mainView === "bulk") {
      setMainView("mails");
    }
  }, [mainView, serviceMode]);

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
        setError("In der Zwischenablage wurde keine gültige URL gefunden.");
        return;
      }

      setJobUrl(pasted);
      setSuccessMessage("URL aus der Zwischenablage eingefügt.");
    } catch {
      setError("Auf die Zwischenablage konnte nicht zugegriffen werden.");
    }
  }

  function dismissReminder(reminderId: string) {
    setDismissedReminderIds((prev) =>
      prev.includes(reminderId) ? prev : [...prev, reminderId]
    );
  }

  async function handleAnalyzeSource() {
    setError("");
    setSuccessMessage("");

    const hasUrl = jobUrl.trim().length > 0;
    const hasFile = !!selectedFile;

    if (!hasUrl && !hasFile) {
      setError(
        isMobile
          ? "Bitte eine Datei auswählen, ein Foto aufnehmen oder eine URL einfügen."
          : "Bitte eine Anzeigen-URL eingeben oder eine Datei auswählen."
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
        setSuccessMessage("Quelle analysiert. Bitte Felder prüfen, Hinweise wählen und dann die E-Mail generieren.");
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
        setSuccessMessage("Quelle analysiert. Bitte Felder prüfen, Hinweise wählen und dann die E-Mail generieren.");
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
      if (mainView === "analytics") {
        await loadTextStats();
      }
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
      setSuccessMessage(`Erinnerungs-Mail (Test) für "${displayMailTitle(item)}" wurde an dich gesendet.`);

      if (reloadAfter) {
        await loadCrm();
        if (mainView === "analytics") {
          await loadTextStats();
        }
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
      if (mainView === "analytics") {
        await loadTextStats();
      }
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
      const leads = buildMockBulkLeads(location, count);
      setBulkLeads(leads);
      setSuccessMessage(`${count} Unternehmen für ${location} im Umkreis von ${bulkRadius} km geladen.`);
    } catch {
      setError("Die Firmenliste konnte nicht geladen werden.");
    } finally {
      setFindingBulkLeads(false);
    }
  }

  function updateBulkLead(id: string, patch: Partial<BulkLead>) {
    setBulkLeads((prev) => prev.map((lead) => (lead.id === id ? { ...lead, ...patch } : lead)));
  }

  async function handleAnalyzeBulkLead(id: string) {
    updateBulkLead(id, { analysisStatus: "loading" });

    await new Promise<void>((resolve) => {
      setTimeout(() => {
        setBulkLeads((prev) =>
          prev.map((lead) => {
            if (lead.id !== id) return lead;

            const seed = lead.company.length % 3;
            const analysisStars = ([1, 2, 3] as const)[seed];
            const foundJobTitles =
              analysisStars === 1
                ? []
                : analysisStars === 2
                ? ["Sachbearbeiter/in"]
                : ["Pflegefachkraft", "Verwaltungsmitarbeiter/in"];

            const analysisSummary =
              analysisStars === 1
                ? "Hinweise auf Karriere- oder Jobbereich gefunden."
                : analysisStars === 2
                ? "Konkreter Jobtitel auf der Website gefunden."
                : "Mehrere Jobtitel oder starkes Recruiting-Signal erkannt.";

            return {
              ...lead,
              analysisStatus: "done",
              analysisStars,
              analysisSummary,
              foundJobTitles,
            };
          })
        );
        resolve();
      }, 500);
    });
  }

  async function handleCollectBulkData(id: string) {
    updateBulkLead(id, { contactStatus: "loading" });

    await new Promise<void>((resolve) => {
      setTimeout(() => {
        setBulkLeads((prev) =>
          prev.map((lead) => {
            if (lead.id !== id) return lead;

            const normalized = normalizeCompany(lead.company).replace(/\s+/g, ".");
            const domain = `${normalized}.de`;
            const emailPrefix =
              lead.analysisStars >= 3
                ? "bewerbung"
                : lead.analysisStars === 2
                ? "jobs"
                : "info";

            const industries = ["Pflege", "Verwaltung", "Bau", "Logistik", "Soziales", "Bildung"];

            return {
              ...lead,
              contactStatus: "done",
              email: `${emailPrefix}@${domain}`,
              contactPerson: lead.analysisStars >= 2 ? "Frau Schneider" : "–",
              industry: industries[lead.company.length % industries.length],
            };
          })
        );
        resolve();
      }, 500);
    });
  }

  async function handleAssessBulkQuality(id: string) {
    updateBulkLead(id, { qualityStatus: "loading" });

    await new Promise<void>((resolve) => {
      setTimeout(() => {
        setBulkLeads((prev) =>
          prev.map((lead) => {
            if (lead.id !== id) return lead;

            const domain = getDomain(lead.email);
            const normalizedLeadCompany = normalizeCompany(lead.company);

            const existing = mailHistory.find((mail) => {
              const sameEmail = lead.email && mail.recipientEmail.toLowerCase() === lead.email.toLowerCase();
              const sameDomain = domain && mail.domain === domain;
              const sameCompany =
                normalizedLeadCompany &&
                mail.company &&
                normalizeCompany(mail.company) === normalizedLeadCompany;

              return sameEmail || sameDomain || sameCompany;
            });

            let qualityStars: 0 | 1 | 2 | 3 = 1;
            let qualitySummary = "Es gibt erste Hinweise, aber noch begrenzte Daten.";

            if (lead.analysisStars >= 2 && lead.email) {
              qualityStars = 2;
              qualitySummary = "Es gibt genug Daten für eine brauchbare Vertriebsmail.";
            }

            if (
              lead.analysisStars >= 3 &&
              lead.email &&
              lead.industry &&
              lead.contactPerson &&
              lead.contactPerson !== "–"
            ) {
              qualityStars = 3;
              qualitySummary = "Guter Lead: klare Recruiting-Hinweise und belastbare Kontaktdaten.";
            }

            if (existing) {
              qualitySummary += " Bereits Kontakt im CRM vorhanden.";
            }

            return {
              ...lead,
              qualityStatus: "done",
              qualityStars,
              qualitySummary,
              alreadyContacted: Boolean(existing),
              lastContactAt: existing?.createdAt || "",
            };
          })
        );
        resolve();
      }, 450);
    });
  }

  async function handleSendBulkLead(id: string) {
    const lead = bulkLeads.find((item) => item.id === id);
    if (!lead) return;

    if (!lead.email) {
      setError("Für dieses Unternehmen wurde noch keine E-Mail-Adresse gefunden.");
      return;
    }

    updateBulkLead(id, { sendStatus: "loading" });

    const introByIndustry: Record<string, string> = {
      Pflege: "viele Einrichtungen stehen aktuell vor der Herausforderung, passendes Personal zuverlässig zu erreichen.",
      Verwaltung: "gerade im Bereich Verwaltung kann zusätzliche Sichtbarkeit helfen, offene Positionen schneller zu besetzen.",
      Bau: "im Bau- und Handwerksbereich ist zusätzliche Reichweite oft entscheidend, um qualifizierte Bewerber zu gewinnen.",
      Logistik: "in der Logistik hilft zusätzliche Sichtbarkeit häufig dabei, offene Stellen schneller mit passenden Bewerbern zu besetzen.",
      Soziales: "im sozialen Bereich ist es oft sinnvoll, offene Stellen regional noch sichtbarer zu machen.",
      Bildung: "gerade im Bildungsbereich kann zusätzliche regionale Reichweite helfen, passende Bewerber gezielt anzusprechen.",
    };

    const intro =
      introByIndustry[lead.industry] ||
      "zusätzliche regionale Sichtbarkeit kann helfen, offene Stellen schneller und gezielter zu besetzen.";

    const bulkText = `Sehr geehrte Damen und Herren,\n\n${intro}\n\nüber jobs-in-berlin-brandenburg.de können Unternehmen ihre Stellenanzeigen zusätzlich regional sichtbar machen und so gezielt Bewerber in Berlin und Brandenburg erreichen.\n\nGerade wenn Recruiting, Reichweite und Kosten eine Rolle spielen, kann eine ergänzende regionale Schaltung eine sinnvolle Unterstützung sein.\n\nGerne sende ich Ihnen ein unverbindliches Angebot zu.\n\nInformationen zu unseren Anzeigenpreisen und weitere Details zur regionalen Stellenbörse finden Sie hier: www.jobs-berlin-brandenburg.de`;

    try {
      const response = await fetch("/api/send-mail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: lead.email,
          text: bulkText,
          testMode,
          sendCopy,
          jobTitle: "",
          company: lead.company,
          contactPerson: lead.contactPerson === "–" ? "" : lead.contactPerson,
          hookBaseId: "bulk",
          hookBaseLabel: "Streumail",
          hookVariantId: "bulk_default",
          hookText: intro,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        updateBulkLead(id, { sendStatus: "error" });
        setError(data.error || "Streumail konnte nicht gesendet werden.");
        return;
      }

      updateBulkLead(id, { sendStatus: "sent" });
      setSuccessMessage(testMode ? `Streumail-Test für "${lead.company}" wurde an dich gesendet.` : `Streumail für "${lead.company}" wurde gesendet.`);
      await loadCrm();
    } catch {
      updateBulkLead(id, { sendStatus: "error" });
      setError("Streumail konnte nicht gesendet werden.");
    }
  }

  function setFieldValue<K extends keyof Pick<JobData, "jobTitle" | "company" | "contactPerson" | "email">>(key: K, value: string) {
    setJobData((prev) => ({ ...prev, [key]: value }));
  }

  const hasAnalyzedSource = !!jobData.jobTitle || !!jobData.company || !!jobData.contactPerson || !!jobData.email;

  return (
    <>
      <div
        style={{
          marginBottom: "18px",
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <button type="button" onClick={() => setMainView("mails")} style={topMenuButtonStyle(mainView === "mails")}>
          Kaltakquise-Mails
        </button>
        {serviceMode !== "cold" ? (
          <button type="button" onClick={() => setMainView("bulk")} style={topMenuButtonStyle(mainView === "bulk")}>
            Streumail
          </button>
        ) : null}
        <button type="button" onClick={() => setMainView("reminders")} style={topMenuButtonStyle(mainView === "reminders")}>
          Erinnerungen
        </button>
        <button type="button" onClick={() => setMainView("analytics")} style={topMenuButtonStyle(mainView === "analytics")}>
          Texte & Auswertungen
        </button>
      </div>

      <div
        style={{
          display: "flex",
          gap: "24px",
          alignItems: "flex-start",
          flexDirection: isMobile ? "column" : "row",
          width: "100%",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          {mainView === "mails" && (
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #d1d5db",
                borderRadius: "14px",
                padding: "20px",
                width: "100%",
                boxSizing: "border-box",
              }}
            >
              <h1 style={{ marginTop: 0, marginBottom: "18px", fontSize: "18px" }}>Kaltakquise-Mails</h1>

              <div
                style={{
                  marginBottom: "22px",
                  paddingBottom: "18px",
                  borderBottom: "1px solid #e5e7eb",
                }}
              >
                <div style={{ fontSize: "16px", fontWeight: 700, marginBottom: "14px" }}>1. Quelle analysieren</div>

                {!isMobile && (
                  <Field label="Anzeigen-URL" value={jobUrl} onChange={setJobUrl} placeholder="https://..." />
                )}

                <div style={{ marginTop: !isMobile ? "4px" : 0 }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: 600,
                    }}
                  >
                    {isMobile ? "Datei, Foto oder URL" : "Datei"}
                  </label>

                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      marginBottom: "12px",
                      flexWrap: "wrap",
                    }}
                  >
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
                        style={{
                          ...uploadLabelStyle,
                          border: "1px solid #cbd5e1",
                          fontSize: "14px",
                        }}
                      >
                        🔗 URL einfügen
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
                      Ausgewählt: {selectedFile.name}
                    </div>
                  )}
                </div>

                <button onClick={handleAnalyzeSource} disabled={analyzingSource} style={primaryButtonStyle(analyzingSource)}>
                  {analyzingSource ? "Wird analysiert..." : "Quelle analysieren"}
                </button>
              </div>

              {error ? (
                <div style={{ marginBottom: "18px", color: "#b91c1c", fontWeight: 600, wordBreak: "break-word" }}>
                  {error}
                </div>
              ) : null}

              {successMessage ? (
                <div style={{ marginBottom: "18px", color: "#166534", fontWeight: 600, wordBreak: "break-word" }}>
                  {successMessage}
                </div>
              ) : null}

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

              <div
                style={{
                  marginBottom: "22px",
                  paddingTop: "2px",
                  paddingBottom: "18px",
                  borderBottom: "1px solid #e5e7eb",
                }}
              >
                <div style={{ fontSize: "16px", fontWeight: 700, marginBottom: "14px" }}>2. Email gestalten</div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "16px",
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                    marginBottom: "16px",
                  }}
                >
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
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        border: "1px solid #cbd5e1",
                        borderRadius: "8px",
                        background: "#ffffff",
                        fontSize: "14px",
                        boxSizing: "border-box",
                      }}
                    >
                      {HOOK_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
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
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    background: "#ffffff",
                    fontSize: "15px",
                    boxSizing: "border-box",
                    resize: "vertical",
                    fontFamily: "Arial, sans-serif",
                    lineHeight: 1.5,
                  }}
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

              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <button onClick={handleSendEmail} disabled={sendingEmail} style={primaryButtonStyle(sendingEmail)}>
                  {sendingEmail ? "Wird gesendet..." : "Email senden"}
                </button>
              </div>
            </div>
          )}

          {mainView === "bulk" && (
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #d1d5db",
                borderRadius: "14px",
                padding: "20px",
                boxSizing: "border-box",
              }}
            >
              <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "18px" }}>Streumail</div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "minmax(180px, 1.2fr) 140px 140px auto",
                  gap: "12px",
                  alignItems: "end",
                  marginBottom: "18px",
                }}
              >
                <Field label="PLZ oder Ort" value={bulkLocation} onChange={setBulkLocation} placeholder="z. B. Potsdam oder 14467" />

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

                <button type="button" onClick={handleFindBulkLeads} disabled={findingBulkLeads} style={primaryButtonStyle(findingBulkLeads)}>
                  {findingBulkLeads ? "Wird gesucht..." : "Liste finden"}
                </button>
              </div>

              {bulkLeads.length === 0 ? (
                <div style={{ fontSize: "14px", color: "#6b7280" }}>Noch keine Firmenliste geladen.</div>
              ) : (
                <BulkLeadsTableNext
                  leads={bulkLeads}
                  onToggleSelected={(id, selected) => updateBulkLead(id, { selected })}
                  onAnalyzeOne={handleAnalyzeBulkLead}
                  onCollectOne={handleCollectBulkData}
                  onQualityOne={handleAssessBulkQuality}
                  onSendOne={handleSendBulkLead}
                />
              )}
            </div>
          )}

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
                              <div
                                style={{
                                  fontSize: "13px",
                                  fontWeight: 600,
                                  lineHeight: 1.25,
                                  display: "-webkit-box",
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: "vertical",
                                  overflow: "hidden",
                                  minHeight: "34px",
                                  flex: 1,
                                }}
                              >
                                {displayMailTitle(item)}
                              </div>

                              {!isCompleted && !isSending && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    dismissReminder(item.id);
                                  }}
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

          {mainView === "analytics" && (
            <div style={{ background: "#ffffff", border: "1px solid #d1d5db", borderRadius: "14px", padding: "20px", boxSizing: "border-box" }}>
              <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "18px" }}>Texte & Auswertungen</div>

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
                          style={{
                            padding: "10px 14px",
                            borderRadius: "999px",
                            border: "1px solid #cbd5e1",
                            background: active ? "#111827" : "#ffffff",
                            color: active ? "#ffffff" : "#111827",
                            cursor: "pointer",
                            fontSize: "14px",
                            fontWeight: 600,
                          }}
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
                            <thead>
                              <tr style={{ background: "#f9fafb", textAlign: "left" }}>
                                <th style={tableHeadStyle}>Variante</th>
                                <th style={tableHeadStyle}>Gesendet</th>
                                <th style={tableHeadStyle}>Geöffnet</th>
                                <th style={tableHeadStyle}>Öffnungsrate</th>
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

        <div
          style={{
            width: isMobile ? "100%" : "340px",
            minWidth: isMobile ? "100%" : "340px",
            background: "#ffffff",
            border: "1px solid #d1d5db",
            borderRadius: "14px",
            padding: "16px",
            boxSizing: "border-box",
            position: isMobile ? "static" : "sticky",
            top: "20px",
          }}
        >
          <div style={{ fontWeight: 700, fontSize: "16px", marginBottom: "12px" }}>CRM</div>

          <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
            <button
              type="button"
              onClick={() => setCrmView("company")}
              style={{
                flex: 1,
                padding: "8px 10px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                background: crmView === "company" ? "#111827" : "#ffffff",
                color: crmView === "company" ? "#ffffff" : "#111827",
                cursor: "pointer",
                fontSize: "13px",
              }}
            >
              Emails an dieses Unternehmen
            </button>

            <button
              type="button"
              onClick={() => setCrmView("all")}
              style={{
                flex: 1,
                padding: "8px 10px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                background: crmView === "all" ? "#111827" : "#ffffff",
                color: crmView === "all" ? "#ffffff" : "#111827",
                cursor: "pointer",
                fontSize: "13px",
              }}
            >
              Alle Emails
            </button>
          </div>

          {loadingCrm ? (
            <div style={{ fontSize: "13px", color: "#6b7280" }}>CRM wird geladen...</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: isMobile ? "none" : "70vh", overflowY: "auto", paddingRight: "2px" }}>
              {mailHistory.length === 0 ? (
                <div style={{ fontSize: "13px", color: "#6b7280" }}>Noch keine passenden Einträge vorhanden.</div>
              ) : (
                mailHistory.map((mail) => (
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
      </div>

      {selectedMail && (
        <div
          onClick={() => {
            setSelectedMail(null);
            setSelectedMailDetail(null);
          }}
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
                onClick={() => {
                  setSelectedMail(null);
                  setSelectedMailDetail(null);
                }}
                style={{ border: "1px solid #cbd5e1", background: "#ffffff", borderRadius: "8px", padding: "6px 10px", cursor: "pointer" }}
              >
                Schließen
              </button>
            </div>

            {loadingDetail ? (
              <div style={{ fontSize: "14px", color: "#6b7280" }}>Details werden geladen...</div>
            ) : selectedMailDetail ? (
              <>
                <div style={{ display: "grid", gap: "10px", marginBottom: "16px", fontSize: "14px" }}>
                  <DetailRow label="Von" value={selectedMailDetail.from || "-"} />
                  <DetailRow label="Empfänger" value={(selectedMailDetail.to || []).join(", ") || "-"} />
                  <DetailRow label="Datum" value={formatDate(selectedMailDetail.createdAt)} />
                  <DetailRow label="Status" value={selectedMailDetail.lastEvent || "-"} />
                  <DetailRow label="Betreff" value={selectedMailDetail.subject || "-"} />
                </div>

                <div>
                  <div style={{ fontWeight: 600, marginBottom: "8px" }}>Mailtext</div>
                  <div
                    style={{
                      whiteSpace: "pre-wrap",
                      background: "#f9fafb",
                      border: "1px solid #e5e7eb",
                      borderRadius: "10px",
                      padding: "12px",
                      fontSize: "14px",
                      lineHeight: 1.5,
                      maxHeight: "400px",
                      overflowY: "auto",
                    }}
                  >
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
    </>
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
