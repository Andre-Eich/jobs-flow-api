"use client";

import { useState } from "react";

export default function PhotoToMailPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [jobData, setJobData] = useState({
    jobTitle: "",
    company: "",
    contactPerson: "",
    email: "",
    generatedEmail: "",
  });

  async function handleAnalyze() {
    setError("");

    if (!selectedFile) {
      setError("Bitte Bild auswählen");
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch("/api/photo-to-mail", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        return;
      }

      setJobData(data);
    } catch {
      setError("Fehler");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1>Photo to Email</h1>

      {/* Upload */}
      <div style={{ display: "flex", gap: 10 }}>
        <label>
          📁 Datei
          <input
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) =>
              setSelectedFile(e.target.files?.[0] || null)
            }
          />
        </label>

        <label>
          📷 Kamera
          <input
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: "none" }}
            onChange={(e) =>
              setSelectedFile(e.target.files?.[0] || null)
            }
          />
        </label>
      </div>

      {selectedFile && <p>{selectedFile.name}</p>}

      <button onClick={handleAnalyze}>
        {loading ? "Analysiere..." : "Analysieren"}
      </button>

      {error && <p>{error}</p>}

      {/* Felder */}
      <input
        value={jobData.jobTitle}
        onChange={(e) =>
          setJobData({ ...jobData, jobTitle: e.target.value })
        }
        placeholder="Jobtitel"
      />

      <input
        value={jobData.company}
        onChange={(e) =>
          setJobData({ ...jobData, company: e.target.value })
        }
        placeholder="Firma"
      />

      <input
        value={jobData.contactPerson}
        onChange={(e) =>
          setJobData({
            ...jobData,
            contactPerson: e.target.value,
          })
        }
        placeholder="Ansprechpartner"
      />

      <input
        value={jobData.email}
        onChange={(e) =>
          setJobData({ ...jobData, email: e.target.value })
        }
        placeholder="Email"
      />

      {/* Mail */}
      <textarea
        value={jobData.generatedEmail}
        onChange={(e) =>
          setJobData({
            ...jobData,
            generatedEmail: e.target.value,
          })
        }
        rows={10}
      />

      {/* Buttons */}
      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={() => {
            window.location.href = `mailto:${jobData.email}?body=${encodeURIComponent(
              jobData.generatedEmail
            )}`;
          }}
          style={{ background: "black", color: "white" }}
        >
          Email senden
        </button>

        <button onClick={handleAnalyze}>Text neu</button>
      </div>
    </div>
  );
}