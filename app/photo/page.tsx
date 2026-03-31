"use client";

import { useState } from "react";

export default function PhotoToMailPage() {
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");

  const [subject, setSubject] = useState("Kurze Frage zu Ihrer Stellenanzeige");
  const [body, setBody] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
    setError("");
  }

  async function analyzeImage() {
    if (!selectedFile) {
      setError("Bitte zuerst ein Foto auswählen.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const formData = new FormData();
      formData.append("image", selectedFile);

      const response = await fetch("/api/photo-to-mail", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Die Analyse ist fehlgeschlagen.");
        return;
      }

      setJobTitle(data.jobTitle || "");
      setCompany(data.company || "");
      setEmail(data.email || "");
      setSubject(data.subject || "");
      setBody(data.body || "");
    } catch {
      setError("Die Anfrage konnte nicht ausgeführt werden.");
    } finally {
      setLoading(false);
    }
  }

  function handleSend() {
    const mailto = `mailto:${email}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;

    window.location.href = mailto;
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(body);
      alert("E-Mail-Text kopiert");
    } catch {
      alert("Kopieren fehlgeschlagen");
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f3f4f6",
        padding: "20px",
        fontFamily: "Arial, sans-serif",
        color: "#111827",
      }}
    >
      <div
        style={{
          maxWidth: "430px",
          margin: "0 auto",
          background: "#ffffff",
          border: "1px solid #d1d5db",
          borderRadius: "20px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "18px 20px",
            borderBottom: "1px solid #e5e7eb",
            background: "#f8fafc",
          }}
        >
          <h1 style={{ margin: 0, fontSize: "18px" }}>Foto → Mail</h1>
          <div style={{ marginTop: "4px", fontSize: "13px", color: "#6b7280" }}>
            Stellenanzeige fotografieren und Mail vorbereiten
          </div>
        </div>

        <div style={{ padding: "20px", display: "grid", gap: "16px" }}>
          <label
            style={{
              display: "block",
              border: "1px solid #cbd5e1",
              borderRadius: "14px",
              padding: "14px",
              background: "#111827",
              color: "#ffffff",
              textAlign: "center",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            📸 Foto aufnehmen
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageChange}
              style={{ display: "none" }}
            />
          </label>

          {preview && (
            <img
              src={preview}
              alt="Vorschau"
              style={{
                width: "100%",
                borderRadius: "14px",
                border: "1px solid #d1d5db",
              }}
            />
          )}

          <button
            onClick={analyzeImage}
            disabled={!selectedFile || loading}
            style={{
              padding: "12px",
              border: "none",
              borderRadius: "14px",
              background: "#111827",
              color: "#ffffff",
              cursor: !selectedFile || loading ? "not-allowed" : "pointer",
              opacity: !selectedFile || loading ? 0.6 : 1,
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            {loading ? "Analysiere Anzeige..." : "Anzeige analysieren"}
          </button>

          {error ? (
            <div style={{ color: "#b91c1c", fontSize: "14px", fontWeight: 600 }}>
              {error}
            </div>
          ) : null}

          <Field
            label="Stellentitel"
            value={jobTitle}
            onChange={setJobTitle}
          />
          <Field
            label="Unternehmen"
            value={company}
            onChange={setCompany}
          />
          <Field
            label="E-Mail-Adresse"
            value={email}
            onChange={setEmail}
          />
          <Field
            label="Betreff"
            value={subject}
            onChange={setSubject}
          />

          <div>
            <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "6px" }}>
              E-Mail-Vorschau
            </div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              style={{
                width: "100%",
                border: "1px solid #cbd5e1",
                borderRadius: "12px",
                padding: "12px",
                fontSize: "14px",
                fontFamily: "Arial, sans-serif",
                resize: "vertical",
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        <div
          style={{
            padding: "20px",
            borderTop: "1px solid #e5e7eb",
            display: "grid",
            gap: "10px",
          }}
        >
          <button
            onClick={handleSend}
            disabled={!email || !body}
            style={{
              padding: "14px",
              border: "none",
              borderRadius: "14px",
              background: "#111827",
              color: "#ffffff",
              cursor: !email || !body ? "not-allowed" : "pointer",
              opacity: !email || !body ? 0.6 : 1,
              fontSize: "15px",
              fontWeight: 600,
            }}
          >
            Senden
          </button>

          <button
            onClick={handleCopy}
            style={{
              padding: "12px",
              border: "1px solid #cbd5e1",
              borderRadius: "14px",
              background: "#ffffff",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            Kopieren
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "6px" }}>
        {label}
      </div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          border: "1px solid #cbd5e1",
          borderRadius: "12px",
          padding: "12px",
          fontSize: "14px",
          boxSizing: "border-box",
        }}
      />
    </div>
  );
}