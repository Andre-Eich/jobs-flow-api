"use client";

import { useEffect, useState } from "react";

type JobData = {
  jobTitle: string;
  company: string;
  contactPerson: string;
  email: string;
  generatedEmail: string;
};

const EMPTY_JOB_DATA: JobData = {
  jobTitle: "",
  company: "",
  contactPerson: "",
  email: "",
  generatedEmail: "",
};

const HINT_OPTIONS = [
  {
    key: "multiple-jobs",
    label: "Mehrere Jobs",
  },
  {
    key: "social-media",
    label: "Social-Media",
  },
  {
    key: "print",
    label: "Print-Anzeige",
  },
  {
    key: "multiposting",
    label: "Multiposting",
  },
] as const;

type HintKey = (typeof HINT_OPTIONS)[number]["key"];

export default function PhotoToMailPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [jobUrl, setJobUrl] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  const [selectedHints, setSelectedHints] = useState<HintKey[]>([]);

  const [analyzing, setAnalyzing] = useState(false);
  const [sending, setSending] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
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
      setAnalyzing(true);

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

        setJobData({
          jobTitle: data.jobTitle || "",
          company: data.company || "",
          contactPerson: data.contactPerson || "",
          email: data.email || "",
          generatedEmail: data.generatedEmail || "",
        });

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

        setJobData({
          jobTitle: data.jobTitle || "",
          company: data.company || "",
          contactPerson: data.contactPerson || "",
          email: data.email || "",
          generatedEmail: data.generatedEmail || "",
        });
      }
    } catch {
      setError("Die Anfrage konnte nicht ausgeführt werden.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleRegenerateEmail() {
    setError("");
    setSuccessMessage("");

    if (!jobData.jobTitle.trim() && !jobData.company.trim()) {
      setError("Bitte zuerst eine Quelle analysieren.");
      return;
    }

    try {
      setRegenerating(true);

      const response = await fetch("/api/regenerate-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jobTitle: jobData.jobTitle,
          company: jobData.company,
          contactPerson: jobData.contactPerson,
          hints: selectedHints,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Fehler bei der Neugenerierung.");
        return;
      }

      setJobData((prev) => ({
        ...prev,
        generatedEmail: data.generatedEmail || prev.generatedEmail,
      }));

      setSuccessMessage("E-Mail-Text neu generiert.");
    } catch {
      setError("Der E-Mail-Text konnte nicht neu generiert werden.");
    } finally {
      setRegenerating(false);
    }
  }

  async function handleSendEmail() {
    setError("");
    setSuccessMessage("");

    if (!jobData.email.trim() && !testMode) {
      setError("Keine E-Mail-Adresse des Unternehmens vorhanden.");
      return;
    }

    if (!jobData.generatedEmail.trim()) {
      setError("Kein E-Mail-Text vorhanden.");
      return;
    }

    try {
      setSending(true);

      const response = await fetch("/api/send-mail", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: jobData.email,
          subject: "Ihre Stellenanzeige auf jobs-in-berlin-brandenburg.de",
          text: jobData.generatedEmail,
          testMode,
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
      setSending(false);
    }
  }

  return (
    <div style={{ width: "100%" }}>
      <h1
        style={{
          marginTop: 0,
          marginBottom: "18px",
          fontSize: "18px",
          wordBreak: "break-word",
        }}
      >
        Photo to Email
      </h1>

      <div
        style={{
          background: "#ffffff",
          border: "1px solid #d1d5db",
          borderRadius: "12px",
          padding: "16px",
          maxWidth: "760px",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {!isMobile && (
          <Field
            label="Anzeigen-URL"
            value={jobUrl}
            onChange={setJobUrl}
            placeholder="https://..."
          />
        )}

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
            marginBottom: "14px",
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
              marginBottom: "18px",
              fontSize: "14px",
              color: "#374151",
              wordBreak: "break-word",
            }}
          >
            Ausgewählt: {selectedFile.name}
          </div>
        )}

        <div style={{ marginBottom: "8px", fontWeight: 600 }}>Hinweise</div>

        <div
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
            marginBottom: "18px",
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
          onClick={handleAnalyzeSource}
          disabled={analyzing}
          style={{
            padding: "10px 16px",
            border: "none",
            borderRadius: "8px",
            background: "#111827",
            color: "#ffffff",
            cursor: analyzing ? "not-allowed" : "pointer",
            fontSize: "15px",
            opacity: analyzing ? 0.7 : 1,
            marginBottom: "24px",
          }}
        >
          {analyzing ? "Wird analysiert..." : "Analysieren und Email generieren"}
        </button>

        {error ? (
          <div
            style={{
              marginBottom: "20px",
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
              marginBottom: "20px",
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
          }}
        >
          <Field
            label="Jobtitel"
            value={jobData.jobTitle}
            onChange={(value) => setJobData({ ...jobData, jobTitle: value })}
          />

          <Field
            label="Firma"
            value={jobData.company}
            onChange={(value) => setJobData({ ...jobData, company: value })}
          />

          <Field
            label="Ansprechpartner"
            value={jobData.contactPerson}
            onChange={(value) =>
              setJobData({ ...jobData, contactPerson: value })
            }
          />

          <Field
            label="Email"
            value={jobData.email}
            onChange={(value) => setJobData({ ...jobData, email: value })}
          />

          <div>
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
                setJobData({ ...jobData, generatedEmail: e.target.value })
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

          <div
            style={{
              fontSize: "13px",
              color: "#6b7280",
              marginTop: "-4px",
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
              marginTop: "4px",
            }}
          >
            <button
              onClick={handleSendEmail}
              disabled={sending}
              style={{
                padding: "10px 16px",
                border: "none",
                borderRadius: "8px",
                background: "#111827",
                color: "#ffffff",
                cursor: sending ? "not-allowed" : "pointer",
                fontSize: "15px",
                opacity: sending ? 0.7 : 1,
              }}
            >
              {sending ? "Wird gesendet..." : "Email senden"}
            </button>

            <button
              onClick={handleRegenerateEmail}
              disabled={regenerating}
              style={secondaryButtonStyle(regenerating)}
            >
              {regenerating ? "Wird neu erstellt..." : "Text neu"}
            </button>
          </div>
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

const uploadLabelStyle: React.CSSProperties = {
  padding: "10px 14px",
  border: "1px solid #cbd5e1",
  borderRadius: "8px",
  background: "#ffffff",
  cursor: "pointer",
};

function secondaryButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: "10px 16px",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    background: "#ffffff",
    color: "#111827",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: "15px",
    opacity: disabled ? 0.7 : 1,
  };
}