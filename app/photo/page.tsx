"use client";

import { useEffect, useState } from "react";

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
  generatedEmail?: string;
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

export default function PhotoToMailPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [jobUrl, setJobUrl] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  const [selectedHints, setSelectedHints] = useState<HintKey[]>([]);

  const [analyzingSource, setAnalyzingSource] = useState(false);
  const [generatingEmail, setGeneratingEmail] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  const [testMode, setTestMode] = useState(true);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [jobData, setJobData] = useState<JobData>(EMPTY_JOB_DATA);

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < 768);
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
    setJobData({
      jobTitle: data.jobTitle || "",
      company: data.company || "",
      contactPerson: data.contactPerson || "",
      email: data.email || "",
      generatedEmail: data.generatedEmail || "",
      jobTitleOptions: uniqueOptions(data.jobTitle || "", data.jobTitleOptions),
      companyOptions: uniqueOptions(data.company || "", data.companyOptions),
      contactPersonOptions: uniqueOptions(
        data.contactPerson || "",
        data.contactPersonOptions
      ),
      emailOptions: uniqueOptions(data.email || "", data.emailOptions),
    });
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
          "Quelle analysiert. Prüfe die Felder, wähle ggf. Bausteine und generiere dann die E-Mail."
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
          "Quelle analysiert. Prüfe die Felder, wähle ggf. Bausteine und generiere dann die E-Mail."
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
          jobTitle: jobData.jobTitle,
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
    } catch {
      setError("Die E-Mail konnte nicht gesendet werden.");
    } finally {
      setSendingEmail(false);
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
    <div style={{ width: "100%" }}>
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
          maxWidth: isMobile ? "100%" : "1180px",
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

          <div style={{ marginBottom: "8px", fontWeight: 600 }}>Hinweise</div>

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

        {/* TESTMODE */}
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

        {/* CTA UNTEN */}
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