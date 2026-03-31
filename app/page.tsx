"use client";

import { useState } from "react";

const DEFAULT_SERVICE_TASK = `Erstelle einen natürlichen deutschen Text mit genau {count} Wörtern.

Vorgaben:
- Das Thema "{theme}" muss klar im Text erkennbar sein.
- Eigenschaften: {properties}
- Der Text soll flüssig und sinnvoll klingen.
- Keine Überschrift.
- Keine Erklärung.
- Gib nur den finalen Text aus.
- Genau {count} Wörter.`;

export default function Home() {
  const [activeTool, setActiveTool] = useState("service-text");

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        background: "#f3f4f6",
        color: "#111827",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: "250px",
          borderRight: "1px solid #d1d5db",
          padding: "20px 16px",
          background: "#e5e7eb",
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: "24px" }}>Jobs-Flow</h2>

        <button
          onClick={() => setActiveTool("service-text")}
          style={{
            display: "block",
            width: "100%",
            textAlign: "left",
            padding: "10px 12px",
            marginBottom: "10px",
            border: "none",
            borderRadius: "8px",
            background:
              activeTool === "service-text" ? "#111827" : "transparent",
            color: activeTool === "service-text" ? "#ffffff" : "#111827",
            cursor: "pointer",
            fontSize: "16px",
          }}
        >
          Service Text
        </button>

        <button
          onClick={() => setActiveTool("text-generator")}
          style={{
            display: "block",
            width: "100%",
            textAlign: "left",
            padding: "10px 12px",
            marginBottom: "10px",
            border: "none",
            borderRadius: "8px",
            background:
              activeTool === "text-generator" ? "#111827" : "transparent",
            color: activeTool === "text-generator" ? "#ffffff" : "#111827",
            cursor: "pointer",
            fontSize: "16px",
          }}
        >
          Text Generator
        </button>
      </div>

      <div
        style={{
          flex: 1,
          padding: "24px 36px",
          background: "#f9fafb",
          overflowY: "auto",
        }}
      >
        {activeTool === "service-text" && <ServiceText />}
        {activeTool === "text-generator" && <TextGeneratorPlaceholder />}
      </div>
    </div>
  );
}

function ServiceText() {
  const [theme, setTheme] = useState("");
  const [properties, setProperties] = useState("");
  const [count, setCount] = useState(30);

  const [result, setResult] = useState("");
  const [actualCount, setActualCount] = useState(0);

  const [variantResults, setVariantResults] = useState<string[]>([]);
  const [variantCounts, setVariantCounts] = useState<number[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [showInfo, setShowInfo] = useState(false);
  const [activeTask, setActiveTask] = useState(DEFAULT_SERVICE_TASK);
  const [draftTask, setDraftTask] = useState(DEFAULT_SERVICE_TASK);

  const [copiedSingle, setCopiedSingle] = useState(false);
  const [copiedVariant1, setCopiedVariant1] = useState(false);
  const [copiedVariant2, setCopiedVariant2] = useState(false);

  async function copyToClipboard(text: string, type: "single" | "v1" | "v2") {
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);

      if (type === "single") {
        setCopiedSingle(true);
        setTimeout(() => setCopiedSingle(false), 1200);
      }

      if (type === "v1") {
        setCopiedVariant1(true);
        setTimeout(() => setCopiedVariant1(false), 1200);
      }

      if (type === "v2") {
        setCopiedVariant2(true);
        setTimeout(() => setCopiedVariant2(false), 1200);
      }
    } catch {
      setError("Kopieren fehlgeschlagen.");
    }
  }

  async function generate() {
    setError("");
    setResult("");
    setActualCount(0);
    setVariantResults([]);
    setVariantCounts([]);
    setCopiedSingle(false);
    setCopiedVariant1(false);
    setCopiedVariant2(false);

    if (!theme.trim()) {
      setError("Bitte ein Thema eingeben.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          theme,
          properties,
          count,
          taskTemplate: activeTask,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Fehler bei der Generierung.");
        return;
      }

      setResult(data.text || "");
      setActualCount(data.actualCount || 0);
    } catch {
      setError("Die Anfrage konnte nicht ausgeführt werden.");
    } finally {
      setLoading(false);
    }
  }

  async function generateTwoVariants() {
    setError("");
    setResult("");
    setActualCount(0);
    setVariantResults([]);
    setVariantCounts([]);
    setCopiedSingle(false);
    setCopiedVariant1(false);
    setCopiedVariant2(false);

    if (!theme.trim()) {
      setError("Bitte ein Thema eingeben.");
      return;
    }

    try {
      setLoading(true);

      const [res1, res2] = await Promise.all([
        fetch("/api/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            theme,
            properties,
            count,
            taskTemplate: activeTask,
          }),
        }),
        fetch("/api/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            theme,
            properties,
            count,
            taskTemplate: activeTask,
          }),
        }),
      ]);

      const data1 = await res1.json();
      const data2 = await res2.json();

      if (!res1.ok || !res2.ok) {
        setError(
          data1.error || data2.error || "Fehler bei der Generierung der Varianten."
        );
        return;
      }

      setVariantResults([data1.text || "", data2.text || ""]);
      setVariantCounts([data1.actualCount || 0, data2.actualCount || 0]);
    } catch {
      setError("Die Anfrage konnte nicht ausgeführt werden.");
    } finally {
      setLoading(false);
    }
  }

  function saveTask() {
    if (!draftTask.trim()) {
      setError("Die Aufgabe darf nicht leer sein.");
      return;
    }
    setError("");
    setActiveTask(draftTask);
  }

  function resetTask() {
    setDraftTask(DEFAULT_SERVICE_TASK);
    setActiveTask(DEFAULT_SERVICE_TASK);
    setError("");
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <h1 style={{ marginTop: 0, marginBottom: "18px", fontSize: "18px" }}>
          Service Text
        </h1>

        <button
          onClick={() => setShowInfo(!showInfo)}
          style={{
            padding: "8px 12px",
            border: "1px solid #cbd5e1",
            borderRadius: "8px",
            background: "#ffffff",
            cursor: "pointer",
            marginBottom: "18px",
            fontSize: "14px",
          }}
        >
          Infos zur Aufgabe {showInfo ? "▲" : "▼"}
        </button>
      </div>

      {showInfo && (
        <div
          style={{
            display: "flex",
            gap: "20px",
            marginBottom: "20px",
            alignItems: "stretch",
            maxWidth: "1100px",
          }}
        >
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <div style={{ marginBottom: "8px", fontWeight: 600 }}>
              Aktuelle Aufgabe
            </div>

            <div
              style={{
                border: "1px solid #d1d5db",
                background: "#ffffff",
                padding: "12px",
                flex: 1,
                whiteSpace: "pre-wrap",
                fontSize: "14px",
                lineHeight: 1.5,
              }}
            >
              {activeTask}
            </div>
          </div>

          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <div style={{ marginBottom: "8px", fontWeight: 600 }}>
              Anpassung der Aufgabe
            </div>

            <textarea
              value={draftTask}
              onChange={(e) => setDraftTask(e.target.value)}
              style={{
                flex: 1,
                border: "1px solid #d1d5db",
                background: "#ffffff",
                padding: "12px",
                fontFamily: "Arial, sans-serif",
                fontSize: "14px",
                resize: "none",
                lineHeight: 1.5,
              }}
            />

            <div style={{ marginTop: "10px", display: "flex", gap: "10px" }}>
              <button
                onClick={saveTask}
                style={{
                  padding: "8px 12px",
                  border: "none",
                  borderRadius: "8px",
                  background: "#111827",
                  color: "#ffffff",
                  cursor: "pointer",
                }}
              >
                Speichern
              </button>

              <button
                onClick={resetTask}
                style={{
                  padding: "8px 12px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  background: "#ffffff",
                  cursor: "pointer",
                }}
              >
                Zurücksetzen
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          background: "#ffffff",
          border: "1px solid #d1d5db",
          borderRadius: "12px",
          padding: "24px",
          maxWidth: "760px",
        }}
      >
        <label
          style={{
            display: "block",
            marginBottom: "8px",
            fontWeight: 600,
          }}
        >
          Thema
        </label>

        <input
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          style={{
            padding: "10px 12px",
            border: "1px solid #cbd5e1",
            borderRadius: "8px",
            background: "#ffffff",
            width: "100%",
            marginBottom: "20px",
            fontSize: "15px",
          }}
        />

        <label
          style={{
            display: "block",
            marginBottom: "8px",
            fontWeight: 600,
          }}
        >
          Eigenschaften
        </label>

        <input
          placeholder="z. B. locker, modern, emotional"
          value={properties}
          onChange={(e) => setProperties(e.target.value)}
          style={{
            padding: "10px 12px",
            border: "1px solid #cbd5e1",
            borderRadius: "8px",
            background: "#ffffff",
            width: "100%",
            marginBottom: "20px",
            fontSize: "15px",
          }}
        />

        <label
          style={{
            display: "block",
            marginBottom: "8px",
            fontWeight: 600,
          }}
        >
          Anzahl Wörter
        </label>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "20px",
            flexWrap: "wrap",
          }}
        >
          <input
            type="number"
            min={1}
            max={200}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            style={{
              padding: "10px 12px",
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              background: "#ffffff",
              width: "100px",
              fontSize: "15px",
            }}
          />

          {[25, 50, 100, 200].map((num) => (
            <button
              key={num}
              onClick={() => setCount(num)}
              style={{
                padding: "6px 10px",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                background: count === num ? "#111827" : "#ffffff",
                color: count === num ? "#ffffff" : "#111827",
                cursor: "pointer",
                fontSize: "13px",
              }}
            >
              {num}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            onClick={generate}
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
            {loading ? "Generiert..." : "Generieren"}
          </button>

          <button
            onClick={generateTwoVariants}
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
            {loading ? "Generiert..." : "2 Varianten generieren"}
          </button>
        </div>
      </div>

      {error ? (
        <div
          style={{
            marginTop: "16px",
            color: "#b91c1c",
            fontWeight: 600,
          }}
        >
          {error}
        </div>
      ) : null}

      {variantResults.length === 2 ? (
        <div
          style={{
            marginTop: "24px",
            display: "flex",
            gap: "20px",
            maxWidth: "1100px",
          }}
        >
          <div
            style={{
              flex: 1,
              position: "relative",
              background: "#ffffff",
              border: "1px solid #d1d5db",
              borderRadius: "12px",
              padding: "16px",
              minHeight: "140px",
              lineHeight: 1.6,
            }}
          >
            <button
              onClick={() => copyToClipboard(variantResults[0], "v1")}
              style={{
                position: "absolute",
                top: "10px",
                right: "10px",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                background: "#ffffff",
                cursor: "pointer",
                padding: "4px 8px",
                fontSize: "14px",
              }}
              title="Kopieren"
            >
              {copiedVariant1 ? "✓" : "📋"}
            </button>

            <div style={{ paddingRight: "40px" }}>
              {variantResults[0] || "Hier erscheint Variante 1."}
            </div>

            <div
              style={{
                marginTop: "10px",
                color: "#6b7280",
                fontSize: "14px",
              }}
            >
              Ziel: {count} Wörter
              {variantCounts[0] > 0 ? ` • Ist: ${variantCounts[0]} Wörter` : ""}
            </div>
          </div>

          <div
            style={{
              flex: 1,
              position: "relative",
              background: "#ffffff",
              border: "1px solid #d1d5db",
              borderRadius: "12px",
              padding: "16px",
              minHeight: "140px",
              lineHeight: 1.6,
            }}
          >
            <button
              onClick={() => copyToClipboard(variantResults[1], "v2")}
              style={{
                position: "absolute",
                top: "10px",
                right: "10px",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                background: "#ffffff",
                cursor: "pointer",
                padding: "4px 8px",
                fontSize: "14px",
              }}
              title="Kopieren"
            >
              {copiedVariant2 ? "✓" : "📋"}
            </button>

            <div style={{ paddingRight: "40px" }}>
              {variantResults[1] || "Hier erscheint Variante 2."}
            </div>

            <div
              style={{
                marginTop: "10px",
                color: "#6b7280",
                fontSize: "14px",
              }}
            >
              Ziel: {count} Wörter
              {variantCounts[1] > 0 ? ` • Ist: ${variantCounts[1]} Wörter` : ""}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div
            style={{
              marginTop: "24px",
              position: "relative",
              background: "#ffffff",
              border: "1px solid #d1d5db",
              borderRadius: "12px",
              padding: "16px",
              minHeight: "140px",
              maxWidth: "900px",
              lineHeight: 1.6,
            }}
          >
            <button
              onClick={() => copyToClipboard(result, "single")}
              style={{
                position: "absolute",
                top: "10px",
                right: "10px",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                background: "#ffffff",
                cursor: "pointer",
                padding: "4px 8px",
                fontSize: "14px",
              }}
              title="Kopieren"
            >
              {copiedSingle ? "✓" : "📋"}
            </button>

            <div style={{ paddingRight: "40px" }}>
              {result || "Hier erscheint der generierte Text."}
            </div>
          </div>

          <div
            style={{
              marginTop: "10px",
              color: "#6b7280",
              fontSize: "14px",
            }}
          >
            Ziel: {count} Wörter
            {actualCount > 0 ? ` • Ist: ${actualCount} Wörter` : ""}
          </div>
        </>
      )}
    </div>
  );
}

function TextGeneratorPlaceholder() {
  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Text Generator</h1>
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #d1d5db",
          borderRadius: "12px",
          padding: "24px",
          maxWidth: "700px",
        }}
      >
        Kommt als nächstes...
      </div>
    </div>
  );
}