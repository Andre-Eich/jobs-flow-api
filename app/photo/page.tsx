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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [jobData, setJobData] = useState<JobData>(EMPTY_JOB_DATA);

  async function handleAnalyze() {
    setError("");

    if (!selectedFile) {
      setError("Bitte ein Bild der Stellenanzeige auswählen.");
      return;
    }

    try {
      setLoading(true);

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
      setLoading(false);
    }
  }

  function handleSendEmail() {
    if (!jobData.email.trim()) {
      setError("Keine E-Mail-Adresse vorhanden.");
      return;
    }

    const subject = "Ihre Stellenanzeige auf jobs-in-berlin-brandenburg.de";
    const body = encodeURIComponent(jobData.generatedEmail);

    window.location.href = `mailto:${jobData.email}?subject=${encodeURIComponent(subject)}&body=${body}`;
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
          disabled={loading}
          style={{
            padding: "10px 16px",
            border: "none",
            borderRadius: "8px",
            background: "#111827",
            color: "#ffffff",
            cursor: loading ? "not-allowed" : "pointer",
            fontSize: "15px",
            opacity: loading ? 0.7 : 1,
            marginBottom: "24px",
          }}
        >
          {loading ? "Wird analysiert..." : "Analysieren"}
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
              rows={14}
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
              style={{
                padding: "10px 16px",
                border: "none",
                borderRadius: "8px",
                background: "#111827",
                color: "#ffffff",
                cursor: "pointer",
                fontSize: "15px",
              }}
            >
              Email senden
            </button>

            <button
              onClick={handleAnalyze}
              disabled={loading}
              style={{
                padding: "10px 16px",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                background: "#ffffff",
                color: "#111827",
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: "15px",
                opacity: loading ? 0.7 : 1,
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