"use client";

import { useState } from "react";

export default function PhotoToMailPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit() {
    setError("");
    setResult("");

    if (!selectedFile) {
      setError("Bitte ein Bild auswählen.");
      return;
    }

    if (!recipient.trim()) {
      setError("Bitte eine Empfänger-E-Mail eingeben.");
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("recipient", recipient);
      formData.append("subject", subject);
      formData.append("message", message);

      const response = await fetch("/api/photo-to-mail", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Fehler beim Senden.");
        return;
      }

      setResult(data.message || "E-Mail erfolgreich gesendet.");
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
          padding: "24px",
          maxWidth: "760px",
        }}
      >
        <label style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}>
          Bild hochladen
        </label>

        <input
          type="file"
          accept="image/*"
          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
          style={{ marginBottom: "20px" }}
        />

        <label style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}>
          Empfänger-E-Mail
        </label>

        <input
          type="email"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="beispiel@firma.de"
          style={{
            padding: "10px 12px",
            border: "1px solid #cbd5e1",
            borderRadius: "8px",
            background: "#ffffff",
            width: "100%",
            marginBottom: "20px",
            fontSize: "15px",
            boxSizing: "border-box",
          }}
        />

        <label style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}>
          Betreff
        </label>

        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Betreff der E-Mail"
          style={{
            padding: "10px 12px",
            border: "1px solid #cbd5e1",
            borderRadius: "8px",
            background: "#ffffff",
            width: "100%",
            marginBottom: "20px",
            fontSize: "15px",
            boxSizing: "border-box",
          }}
        />

        <label style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}>
          Nachricht
        </label>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Optionale Nachricht"
          rows={6}
          style={{
            padding: "10px 12px",
            border: "1px solid #cbd5e1",
            borderRadius: "8px",
            background: "#ffffff",
            width: "100%",
            marginBottom: "20px",
            fontSize: "15px",
            boxSizing: "border-box",
            resize: "vertical",
            fontFamily: "Arial, sans-serif",
          }}
        />

        <button
          onClick={handleSubmit}
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
          }}
        >
          {loading ? "Wird gesendet..." : "Bild per E-Mail senden"}
        </button>
      </div>

      {error ? (
        <div style={{ marginTop: "16px", color: "#b91c1c", fontWeight: 600 }}>
          {error}
        </div>
      ) : null}

      {result ? (
        <div style={{ marginTop: "16px", color: "#166534", fontWeight: 600 }}>
          {result}
        </div>
      ) : null}
    </div>
  );
}