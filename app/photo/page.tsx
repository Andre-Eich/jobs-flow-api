"use client";

import { useState } from "react";

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

export default function PhotoToMailPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [jobData, setJobData] = useState<JobData>(EMPTY_JOB_DATA);

  async function handleAnalyze() {
    setError("");
    setSuccessMessage("");

    if (!selectedFile) {
      setError("Bitte ein Bild der Stellenanzeige auswählen.");
      return;
    }

    try {
      setAnalyzing(true);

      const formData = new FormData();
      formData.append("file", selectedFile);

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
    } catch {
      setError("Die Anfrage konnte nicht ausgeführt werden.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleSendEmail() {
    setError("");
    setSuccessMessage("");

    if (!jobData.email.trim()) {
      setError("Keine E-Mail-Adresse vorhanden.");
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
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Fehler beim Senden.");
        return;
      }

      setSuccessMessage("E-Mail erfolgreich gesendet.");
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
        <label
          style={{
            display: "block",
            marginBottom: "8px",
            fontWeight: 600,
          }}
        >
          Stellenanzeige hochladen
        </label>

        <div
          style={{
            display: "flex",
            gap: "10px",
            marginBottom: "14px",
            flexWrap: "wrap",
          }}
        >
          <label
            style={{
              padding: "10px 14px",
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              background: "#ffffff",
              cursor: "pointer",
            }}
          >
            📁 Datei
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              style={{ display: "none" }}
            />
          </label>

          <label
            style={{
              padding: "10px 14px",
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              background: "#ffffff",
              cursor: "pointer",
            }}
          >
            📷 Kamera
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              style={{ display: "none" }}
            />
          </label>
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

        <button
          onClick={handleAnalyze}
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
          {analyzing ? "Wird analysiert..." : "Analysieren"}
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
              onClick={handleAnalyze}
              disabled={analyzing}
              style={{
                padding: "10px 16px",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                background: "#ffffff",
                color: "#111827",
                cursor: analyzing ? "not-allowed" : "pointer",
                fontSize: "15px",
                opacity: analyzing ? 0.7 : 1,
              }}
            >
              Text neu
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
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