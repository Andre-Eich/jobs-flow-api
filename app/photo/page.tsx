"use client";

import { useState } from "react";

type ExtractedJobData = {
  jobTitle: string;
  company: string;
  contactPerson: string;
  email: string;
  generatedEmail: string;
};

const DEFAULT_VALUES = {
  jobTitle: "die ausgeschriebene Position",
  company: "Ihr Unternehmen",
  contactPerson: "Guten Tag",
  email: "",
};

export default function PhotoToMailPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [jobData, setJobData] = useState<ExtractedJobData>({
    jobTitle: DEFAULT_VALUES.jobTitle,
    company: DEFAULT_VALUES.company,
    contactPerson: DEFAULT_VALUES.contactPerson,
    email: DEFAULT_VALUES.email,
    generatedEmail: "",
  });

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
        jobTitle: data.jobTitle || DEFAULT_VALUES.jobTitle,
        company: data.company || DEFAULT_VALUES.company,
        contactPerson: data.contactPerson || DEFAULT_VALUES.contactPerson,
        email: data.email || DEFAULT_VALUES.email,
        generatedEmail: data.generatedEmail || "",
      });
    } catch {
      setError("Die Anfrage konnte nicht ausgeführt werden.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 style={{ marginTop: 0, marginBottom: "18px", fontSize: "18px" }}>
        Photo to Email
      </h1>

      <div
        style={{
          background: "#ffffff",
          border: "1px solid #d1d5db",
          borderRadius: "12px",
          padding: "16px",
          maxWidth: "850px",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <label style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}>
          Stellenanzeige hochladen
        </label>

        <input
          type="file"
          accept="image/*"
          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
          style={{
            marginBottom: "20px",
            width: "100%",
          }}
        />

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
          {loading ? "Wird analysiert..." : "Bild analysieren"}
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
          <Field label="Stellentitel" value={jobData.jobTitle} />
          <Field label="Unternehmen" value={jobData.company} />
          <Field label="Ansprechpartner" value={jobData.contactPerson} />
          <Field label="E-Mail-Adresse" value={jobData.email || "Nicht gefunden"} />

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
              readOnly
              rows={10}
              style={{
                width: "100%",
                padding: "12px",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                background: "#f9fafb",
                fontSize: "15px",
                boxSizing: "border-box",
                resize: "vertical",
                fontFamily: "Arial, sans-serif",
                lineHeight: 1.5,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
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
        readOnly
        style={{
          width: "100%",
          padding: "10px 12px",
          border: "1px solid #cbd5e1",
          borderRadius: "8px",
          background: "#f9fafb",
          fontSize: "15px",
          boxSizing: "border-box",
        }}
      />
    </div>
  );
}