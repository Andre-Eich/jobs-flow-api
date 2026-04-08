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

type MailStatus = "sent" | "test" | "failed" | "draft";

type MailRecord = {
  id: string;
  jobTitle: string;
  company: string;
  normalizedCompany: string;
  contactPerson: string;
  recipientEmail: string;
  domain: string;
  text: string;
  status: MailStatus;
  createdAt: string;
  hints: HintKey[];
  followupSent?: boolean;
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

function statusLabel(status: MailStatus) {
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

function statusColor(status: MailStatus) {
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

  const [testMode, setTestMode] = useState(true);
  const [sendCopy, setSendCopy] = useState(true);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [jobData, setJobData] = useState<JobData>(EMPTY_JOB_DATA);

  const [crmView, setCrmView] = useState<"company" | "all">("company");
  const [selectedMail, setSelectedMail] = useState<MailRecord | null>(null);

  const [mailHistory, setMailHistory] = useState<MailRecord[]>([
    {
      id: "1",
      jobTitle: "Sachbearbeiter Finanzbuchhaltung",
      company: "Oder-Spree Krankenhaus GmbH",
      normalizedCompany: normalizeCompany("Oder-Spree Krankenhaus GmbH"),
      contactPerson: "",
      recipientEmail: "bewerbung@os-kh.de",
      domain: "os-kh.de",
      text: "Beispieltext 1",
      status: "sent",
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 - 60 * 60 * 1000).toISOString(),
      hints: ["multiposting"],
      followupSent: false,
    },
    {
      id: "2",
      jobTitle: "Pflegefachkraft",
      company: "Klinikum Frankfurt (Oder)",
      normalizedCompany: normalizeCompany("Klinikum Frankfurt (Oder)"),
      contactPerson: "",
      recipientEmail: "jobs@klinikum-ffo.de",
      domain: "klinikum-ffo.de",
      text: "Beispieltext 2",
      status: "test",
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      hints: ["social-media"],
      followupSent: false,
    },
  ]);

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

      const newRecord: MailRecord = {
        id: crypto.randomUUID(),
        jobTitle: jobData.jobTitle,
        company: jobData.company,
        normalizedCompany: normalizeCompany(jobData.company),
        contactPerson: jobData.contactPerson,
        recipientEmail: data.actualRecipient || jobData.email,
        domain: getDomain(data.actualRecipient || jobData.email),
        text: jobData.generatedEmail,
        status: testMode ? "test" : "sent",
        createdAt: new Date().toISOString(),
        hints: selectedHints,
        followupSent: false,
      };

      setMailHistory((prev) => [newRecord, ...prev].slice(0, 100));

      setSuccessMessage(
        testMode
          ? "Test-E-Mail erfolgreich an dich gesendet."
          : "E-Mail erfolgreich gesendet."
      );
    } catch {
      setError("Die E-Mail konnte nicht gesendet werden.");
    } finally {
      setSendingEmail(false);
    }
  }

  async function handleReminderClick(item: MailRecord) {
    setError("");
    setSuccessMessage("");

    try {
      setGeneratingEmail(true);

      const response = await fetch("/api/regenerate-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jobTitle: item.jobTitle,
          company: item.company,
          contactPerson: item.contactPerson,
          hints: item.hints,
          followUp: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Fehler bei der Erinnerungs-Mail.");
        return;
      }

      setJobData((prev) => ({
        ...prev,
        jobTitle: item.jobTitle,
        company: item.company,
        contactPerson: item.contactPerson,
        email: item.recipientEmail,
        generatedEmail: data.generatedEmail || "",
      }));

      setSelectedHints(item.hints || []);
      setSuccessMessage("Erinnerungs-Mail wurde generiert.");
    } catch {
      setError("Die Erinnerungs-Mail konnte nicht generiert werden.");
    } finally {
      setGeneratingEmail(false);
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

  const currentDomain = getDomain(jobData.email);
  const currentCompany = normalizeCompany(jobData.company);

  const filteredHistory = useMemo(() => {
    const sorted = [...mailHistory].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    if (crmView === "all") {
      return sorted.slice(0, 25);
    }

    return sorted
      .filter((mail) => {
        const sameDomain =
          currentDomain && mail.domain && mail.domain === currentDomain;
        const sameCompany =
          currentCompany &&
          mail.normalizedCompany &&
          mail.normalizedCompany === currentCompany;

        return sameDomain || sameCompany;
      })
      .slice(0, 25);
  }, [mailHistory, crmView, currentDomain, currentCompany]);

  const reminders = useMemo(() => {
    const now = Date.now();

    return mailHistory.filter((mail) => {
      const threeDaysPassed =
        new Date(mail.createdAt).getTime() <=
        now - 3 * 24 * 60 * 60 * 1000;

      return (
        mail.status === "sent" &&
        !mail.followupSent &&
        threeDaysPassed
      );
    });
  }, [mailHistory]);

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
          {/* REMINDERS */}
          {reminders.length > 0 && (
            <div style={{ marginBottom: "16px" }}>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: "14px",
                  marginBottom: "8px",
                }}
              >
                Erinnerungen ({reminders.length})
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  flexWrap: "wrap",
                }}
              >
                {reminders.slice(0, 5).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleReminderClick(item)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "10px",
                      background: "#f3f4f6",
                      border: "1px solid #e5e7eb",
                      cursor: "pointer",
                      lineHeight: 1.2,
                      minWidth: "200px",
                      textAlign: "left",
                    }}
                  >
                    <div style={{ fontSize: "13px", fontWeight: 600 }}>
                      {item.jobTitle}
                    </div>
                    <div style={{ fontSize: "12px", color: "#6b7280" }}>
                      {item.company}
                    </div>
                  </button>
                ))}

                {reminders.length > 5 && (
                  <div
                    style={{
                      padding: "8px 12px",
                      borderRadius: "10px",
                      background: "#e5e7eb",
                      fontSize: "12px",
                    }}
                  >
                    +{reminders.length - 5} weitere
                  </div>
                )}
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
            {/* STUFE 1 */}
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

            {/* ERKANNTE FELDER */}
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

            {/* STUFE 2 */}
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

            {/* GENERIERTE EMAIL */}
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

            {/* OPTIONEN */}
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
            {filteredHistory.length === 0 ? (
              <div
                style={{
                  fontSize: "13px",
                  color: "#6b7280",
                }}
              >
                Noch keine passenden Einträge vorhanden.
              </div>
            ) : (
              filteredHistory.map((mail) => (
                <button
                  key={mail.id}
                  type="button"
                  onClick={() => setSelectedMail(mail)}
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
                    {mail.jobTitle}
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
        </div>
      </div>

      {/* MODAL */}
      {selectedMail && (
        <div
          onClick={() => setSelectedMail(null)}
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
                  {selectedMail.jobTitle}
                </div>

                <div
                  style={{
                    color: "#374151",
                    fontSize: "14px",
                  }}
                >
                  {selectedMail.company}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedMail(null)}
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

            <div
              style={{
                display: "grid",
                gap: "10px",
                marginBottom: "16px",
                fontSize: "14px",
              }}
            >
              <DetailRow label="Empfänger" value={selectedMail.recipientEmail} />
              <DetailRow label="Ansprechpartner" value={selectedMail.contactPerson || "-"} />
              <DetailRow label="Datum" value={formatDate(selectedMail.createdAt)} />
              <DetailRow
                label="Status"
                value={statusLabel(selectedMail.status)}
                valueColor={statusColor(selectedMail.status)}
              />
              <DetailRow label="Domain" value={selectedMail.domain || "-"} />
              <DetailRow
                label="Hinweise"
                value={
                  selectedMail.hints.length > 0
                    ? selectedMail.hints.join(", ")
                    : "-"
                }
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
                }}
              >
                {selectedMail.text || "-"}
              </div>
            </div>
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
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "140px 1fr",
        gap: "12px",
      }}
    >
      <div style={{ color: "#6b7280" }}>{label}</div>
      <div style={{ color: valueColor || "#111827", wordBreak: "break-word" }}>
        {value}
      </div>
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