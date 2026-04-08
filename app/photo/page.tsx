"use client";

import { useEffect, useMemo, useState } from "react";

type HintKey =
  | "multiple-jobs"
  | "social-media"
  | "print"
  | "multiposting";

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
};

type MailRecord = {
  id: string;
  jobTitle: string;
  company: string;
  normalizedCompany?: string;
  contactPerson: string;
  recipientEmail: string;
  domain: string;
  subject?: string;
  text: string;
  status: "sent" | "test" | "failed" | "draft";
  createdAt: string;
  lastEvent?: string;
  reminderLabel?: string;
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
};

const HINT_OPTIONS: { key: HintKey; label: string }[] = [
  { key: "multiple-jobs", label: "Mehrere Jobs" },
  { key: "social-media", label: "Social-Media" },
  { key: "print", label: "Print-Anzeige" },
  { key: "multiposting", label: "Multiposting" },
];

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

export default function PhotoToMailPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [jobUrl, setJobUrl] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  const [selectedHints, setSelectedHints] = useState<HintKey[]>([]);

  const [analyzingSource, setAnalyzingSource] = useState(false);
  const [generatingEmail, setGeneratingEmail] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [loadingCrm, setLoadingCrm] = useState(false);
  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null);

  const [testMode, setTestMode] = useState(true);
  const [sendCopy, setSendCopy] = useState(true);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [jobData, setJobData] = useState<JobData>(EMPTY_JOB_DATA);

  const [crmView, setCrmView] = useState<"company" | "all">("company");
  const [mailHistory, setMailHistory] = useState<MailRecord[]>([]);
  const [reminders, setReminders] = useState<MailRecord[]>([]);
  const [selectedMail, setSelectedMail] = useState<MailRecord | null>(null);
  const [selectedMailDetail, setSelectedMailDetail] = useState<MailDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < 980);
    }

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  function toggleHint(hint: HintKey) {
    setSelectedHints((prev) =>
      prev.includes(hint)
        ? prev.filter((item) => item !== hint)
        : [...prev, hint]
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
      contactPersonOptions: uniqueOptions(
        data.contactPerson || "",
        data.contactPersonOptions
      ),
      emailOptions: uniqueOptions(data.email || "", data.emailOptions),
    }));
  }

  const currentDomain = useMemo(() => getDomain(jobData.email), [jobData.email]);
  const currentCompany = useMemo(
    () => normalizeCompany(jobData.company),
    [jobData.company]
  );

  async function loadCrm() {
    try {
      setLoadingCrm(true);

      const params = new URLSearchParams({
        mode: crmView,
      });

      if (currentDomain) params.set("domain", currentDomain);
      if (currentCompany) params.set("company", currentCompany);

      const response = await fetch(`/api/crm/emails?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "CRM konnte nicht geladen werden.");
        return;
      }

      setMailHistory(data.emails || []);
      setReminders(data.reminders || []);
    } catch {
      setError("CRM konnte nicht geladen werden.");
    } finally {
      setLoadingCrm(false);
    }
  }

  useEffect(() => {
    loadCrm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crmView, currentDomain, currentCompany]);

  async function handleAnalyzeSource() {
    setError("");
    setSuccessMessage("");

    const hasUrl = !isMobile && jobUrl.trim().length > 0;
    const hasFile = !!selectedFile;

    if (!hasUrl && !hasFile) {
      setError(
        isMobile
          ? "Bitte eine Datei auswählen oder ein Foto aufnehmen."
          : "Bitte eine Anzeigen-URL eingeben oder eine Datei auswählen."
      );
      return;
    }

    try {
      setAnalyzingSource(true);

      if (hasUrl) {
        const response = await fetch("/api/photo-to-mail-url", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: jobUrl.trim(),
            hints: selectedHints,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Fehler bei der URL-Analyse.");
          return;
        }

        applyAnalyzeData(data);
        setSuccessMessage(
          "Quelle analysiert. Bitte Felder prüfen, Hinweise wählen und dann die E-Mail generieren."
        );
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
        setSuccessMessage(
          "Quelle analysiert. Bitte Felder prüfen, Hinweise wählen und dann die E-Mail generieren."
        );
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jobTitle: jobData.jobTitle,
          company: jobData.company,
          contactPerson: jobData.contactPerson,
          email: jobData.email,
          hints: selectedHints,
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: jobData.email,
          text: jobData.generatedEmail,
          testMode,
          sendCopy,
          jobTitle: jobData.jobTitle,
          company: jobData.company,
          contactPerson: jobData.contactPerson,
          hints: selectedHints,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Fehler beim Senden.");
        return;
      }

      setSuccessMessage(
        testMode
          ? "Test-E-Mail erfolgreich an dich gesendet."
          : "E-Mail erfolgreich gesendet."
      );

      await loadCrm();
    } catch {
      setError("Die E-Mail konnte nicht gesendet werden.");
    } finally {
      setSendingEmail(false);
    }
  }

  async function handleReminderQuickSend(item: MailRecord) {
    setError("");
    setSuccessMessage("");

    try {
      setSendingReminderId(item.id);

      const genResponse = await fetch("/api/regenerate-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jobTitle: item.jobTitle,
          company: item.company,
          contactPerson: item.contactPerson,
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: item.recipientEmail,
          text: genData.generatedEmail,
          testMode: true,
          sendCopy: true,
          jobTitle: item.jobTitle,
          company: item.company,
          contactPerson: item.contactPerson,
          hints: [],
        }),
      });

      const sendData = await sendResponse.json();

      if (!sendResponse.ok) {
        setError(sendData.error || "Erinnerungs-Mail konnte nicht gesendet werden.");
        return;
      }

      setSuccessMessage(
        `Erinnerungs-Mail (Test) für "${item.jobTitle}" wurde an dich gesendet.`
      );

      await loadCrm();
    } catch {
      setError("Erinnerungs-Mail konnte nicht gesendet werden.");
    } finally {
      setSendingReminderId(null);
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

  function setFieldValue<
    K extends keyof Pick<
      JobData,
      "jobTitle" | "company" | "contactPerson" | "email"
    >
  >(key: K, value: string) {
    setJobData((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  const hasAnalyzedSource =
    !!jobData.jobTitle ||
    !!jobData.company ||
    !!jobData.contactPerson ||
    !!jobData.email;

  return (
    <>
      <div
        style={{
          display: "flex",
          gap: "24px",
          alignItems: "flex-start",
          flexDirection: isMobile ? "column" : "row",
          width: "100%",
        }}
      >
        {/* LINKE SEITE */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {reminders.length > 0 && (
            <div style={{ marginBottom: "16px" }}>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: "14px",
                  marginBottom: "8px",
                }}
              >
                Erinnerungen (Test)
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  flexWrap: "wrap",
                }}
              >
                {reminders.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleReminderQuickSend(item)}
                    disabled={sendingReminderId === item.id}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "10px",
                      background: "#f3f4f6",
                      border: "1px solid #e5e7eb",
                      cursor:
                        sendingReminderId === item.id ? "not-allowed" : "pointer",
                      lineHeight: 1.2,
                      minWidth: "220px",
                      textAlign: "left",
                      opacity: sendingReminderId === item.id ? 0.7 : 1,
                    }}
                  >
                    <div style={{ fontSize: "13px", fontWeight: 600 }}>
                      {item.jobTitle}
                    </div>
                    <div style={{ fontSize: "12px", color: "#6b7280" }}>
                      {item.company}
                    </div>
                    <div
                      style={{
                        marginTop: "6px",
                        fontSize: "11px",
                        color: "#6b7280",
                      }}
                    >
                      3 Tage nach 1. Mail
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <h1
            style={{
              marginTop: 0,
              marginBottom: "18px",
              fontSize: "18px",
            }}
          >
            Photo to Email
          </h1>

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
            <div
              style={{
                marginBottom: "22px",
                paddingBottom: "18px",
                borderBottom: "1px solid #e5e7eb",
              }}
            >
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: 700,
                  marginBottom: "14px",
                }}
              >
                1. Quelle analysieren
              </div>

              {!isMobile && (
                <Field
                  label="Anzeigen-URL"
                  value={jobUrl}
                  onChange={setJobUrl}
                  placeholder="https://..."
                />
              )}

              <div
                style={{
                  marginTop: !isMobile ? "4px" : 0,
                }}
              >
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: 600,
                  }}
                >
                  {isMobile ? "Datei oder Foto" : "Datei"}
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
                      onChange={(e) =>
                        setSelectedFile(e.target.files?.[0] || null)
                      }
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
                        onChange={(e) =>
                          setSelectedFile(e.target.files?.[0] || null)
                        }
                        style={{ display: "none" }}
                      />
                    </label>
                  )}
                </div>

                {selectedFile && (
                  <div
                    style={{
                      marginBottom: "12px",
                      fontSize: "14px",
                      color: "#374151",
                      wordBreak: "break-word",
                    }}
                  >
                    Ausgewählt: {selectedFile.name}
                  </div>
                )}
              </div>

              <button
                onClick={handleAnalyzeSource}
                disabled={analyzingSource}
                style={primaryButtonStyle(analyzingSource)}
              >
                {analyzingSource ? "Wird analysiert..." : "Quelle analysieren"}
              </button>
            </div>

            {error ? (
              <div
                style={{
                  marginBottom: "18px",
                  color: "#b91c1c",
                  fontWeight: 600,
                  wordBreak: "break-word",
                }}
              >
                {error}
              </div>
            ) : null}

            {successMessage ? (
              <div
                style={{
                  marginBottom: "18px",
                  color: "#166534",
                  fontWeight: 600,
                  wordBreak: "break-word",
                }}
              >
                {successMessage}
              </div>
            ) : null}

            <div
              style={{
                display: "grid",
                gap: "16px",
                marginBottom: "24px",
              }}
            >
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
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: 700,
                  marginBottom: "14px",
                }}
              >
                2. Email gestalten
              </div>

              <div style={{ marginBottom: "8px", fontWeight: 600 }}>
                Hinweise
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  flexWrap: "wrap",
                  marginBottom: "16px",
                }}
              >
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

              <button
                onClick={handleGenerateEmail}
                disabled={generatingEmail || !hasAnalyzedSource}
                style={primaryButtonStyle(generatingEmail || !hasAnalyzedSource)}
              >
                {generatingEmail ? "Wird generiert..." : "Email generieren"}
              </button>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: 600,
                }}
              >
                Generierte E-Mail
              </label>

              <textarea
                value={jobData.generatedEmail}
                onChange={(e) =>
                  setJobData((prev) => ({
                    ...prev,
                    generatedEmail: e.target.value,
                  }))
                }
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

            <div style={{ marginBottom: "2px" }}>
              <label style={{ fontSize: "14px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={testMode}
                  onChange={(e) => setTestMode(e.target.checked)}
                  style={{ marginRight: "6px" }}
                />
                Test an mich senden
              </label>
            </div>

            <div style={{ marginBottom: "2px" }}>
              <label style={{ fontSize: "14px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={sendCopy}
                  onChange={(e) => setSendCopy(e.target.checked)}
                  style={{ marginRight: "6px" }}
                />
                Kopie an mich senden
              </label>
            </div>

            <div
              style={{
                fontSize: "13px",
                color: "#6b7280",
                marginBottom: "18px",
              }}
            >
              {testMode
                ? "Versand geht an deine Testadresse."
                : "Versand geht an die erkannte Unternehmens-E-Mail."}
            </div>

            <div
              style={{
                display: "flex",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              <button
                onClick={handleSendEmail}
                disabled={sendingEmail}
                style={primaryButtonStyle(sendingEmail)}
              >
                {sendingEmail ? "Wird gesendet..." : "Email senden"}
              </button>
            </div>
          </div>
        </div>

        {/* RECHTE CRM-SPALTE */}
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
          <div
            style={{
              fontWeight: 700,
              fontSize: "16px",
              marginBottom: "12px",
            }}
          >
            CRM
          </div>

          <div
            style={{
              display: "flex",
              gap: "8px",
              marginBottom: "14px",
            }}
          >
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
            <div style={{ fontSize: "13px", color: "#6b7280" }}>
              CRM wird geladen...
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                maxHeight: isMobile ? "none" : "70vh",
                overflowY: "auto",
                paddingRight: "2px",
              }}
            >
              {mailHistory.length === 0 ? (
                <div
                  style={{
                    fontSize: "13px",
                    color: "#6b7280",
                  }}
                >
                  Noch keine passenden Einträge vorhanden.
                </div>
              ) : (
                mailHistory.map((mail) => (
                  <button
                    key={mail.id}
                    type="button"
                    onClick={() => handleOpenMailDetail(mail)}
                    style={{
                      textAlign: "left",
                      border: "1px solid #e5e7eb",
                      borderRadius: "10px",
                      padding: "10px",
                      background: "#ffffff",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: "13px",
                        marginBottom: "4px",
                      }}
                    >
                      {mail.jobTitle || "Ohne Betreff"}
                    </div>

                    <div
                      style={{
                        fontSize: "12px",
                        color: "#374151",
                        marginBottom: "4px",
                        wordBreak: "break-word",
                      }}
                    >
                      {mail.recipientEmail}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "8px",
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "11px",
                          color: "#6b7280",
                        }}
                      >
                        {formatDate(mail.createdAt)}
                      </div>

                      <div
                        style={{
                          fontSize: "11px",
                          fontWeight: 600,
                          color: statusColor(mail.status),
                        }}
                      >
                        {statusLabel(mail.status)}
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
                marginBottom: "16px",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "18px",
                    fontWeight: 700,
                    marginBottom: "4px",
                  }}
                >
                  {selectedMail.jobTitle || "Ohne Betreff"}
                </div>

                <div
                  style={{
                    color: "#374151",
                    fontSize: "14px",
                  }}
                >
                  {selectedMail.recipientEmail}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedMail(null);
                  setSelectedMailDetail(null);
                }}
                style={{
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  borderRadius: "8px",
                  padding: "6px 10px",
                  cursor: "pointer",
                }}
              >
                Schließen
              </button>
            </div>

            {loadingDetail ? (
              <div style={{ fontSize: "14px", color: "#6b7280" }}>
                Details werden geladen...
              </div>
            ) : selectedMailDetail ? (
              <>
                <div
                  style={{
                    display: "grid",
                    gap: "10px",
                    marginBottom: "16px",
                    fontSize: "14px",
                  }}
                >
                  <DetailRow label="Von" value={selectedMailDetail.from || "-"} />
                  <DetailRow
                    label="Empfänger"
                    value={(selectedMailDetail.to || []).join(", ") || "-"}
                  />
                  <DetailRow
                    label="Datum"
                    value={formatDate(selectedMailDetail.createdAt)}
                  />
                  <DetailRow
                    label="Status"
                    value={selectedMailDetail.lastEvent || "-"}
                  />
                  <DetailRow
                    label="Betreff"
                    value={selectedMailDetail.subject || "-"}
                  />
                </div>

                <div>
                  <div
                    style={{
                      fontWeight: 600,
                      marginBottom: "8px",
                    }}
                  >
                    Mailtext
                  </div>

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
                    {selectedMailDetail.text ||
                      "Kein Plain-Text vorhanden. HTML liegt vor."}
                  </div>
                </div>
              </>
            ) : (
              <div style={{ fontSize: "14px", color: "#6b7280" }}>
                Keine Details geladen.
              </div>
            )}
          </div>
        </div>
      )}
    </>
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

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
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