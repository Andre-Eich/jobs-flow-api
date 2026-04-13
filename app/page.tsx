"use client";

import { useEffect, useState } from "react";
import BulkMailPage from "./photo/page";
import ColdMailPage from "./photo/page.replacement";
import CrmPage from "./crm/page";
import PromptsTextPage from "./prompts-text/page";

const DEFAULT_SERVICE_TASK = `Erstelle einen natürlichen deutschen Text mit genau {count} Wörtern.

Vorgaben:
- Das Thema "{theme}" muss klar im Text erkennbar sein.
- Eigenschaften: {properties}
- Der Text soll flüssig und sinnvoll klingen.
- Keine Überschrift.
- Keine Erklärung.
- Gib nur den finalen Text aus.
- Genau {count} Wörter.`;

type ToolKey =
  | "service-text"
  | "text-generator"
  | "photo-mail"
  | "bulk-mail"
  | "crm"
  | "prompts-text";

export default function Home() {
  const [activeTool, setActiveTool] = useState<ToolKey>("service-text");
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < 900);
    }

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  function handleSelectTool(tool: ToolKey) {
    setActiveTool(tool);
    setMobileMenuOpen(false);
  }

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "#f3f4f6",
        color: "#111827",
        fontFamily: "Arial, sans-serif",
      }}
    >
      {!isMobile && (
        <aside
          style={{
            width: "250px",
            borderRight: "1px solid #d1d5db",
            padding: "20px 16px",
            background: "#e5e7eb",
            flexShrink: 0,
          }}
        >
          <h2 style={{ marginTop: 0, marginBottom: "24px" }}>Jobs-Flow</h2>

          <SidebarButton
            active={activeTool === "service-text"}
            onClick={() => handleSelectTool("service-text")}
            label="Service Text"
          />

          <SidebarButton
            active={activeTool === "text-generator"}
            onClick={() => handleSelectTool("text-generator")}
            label="Text Generator"
          />

          <SidebarButton
            active={activeTool === "photo-mail"}
            onClick={() => handleSelectTool("photo-mail")}
            label="Kaltakquise-Mails"
          />

          <SidebarButton
            active={activeTool === "bulk-mail"}
            onClick={() => handleSelectTool("bulk-mail")}
            label="Streumails"
          />

          <SidebarButton
            active={activeTool === "crm"}
            onClick={() => handleSelectTool("crm")}
            label="CRM"
          />

          <SidebarButton
            active={activeTool === "prompts-text"}
            onClick={() => handleSelectTool("prompts-text")}
            label="Prompts & Texte"
          />
        </aside>
      )}

      <main
        style={{
          flex: 1,
          padding: isMobile ? "16px" : "24px 36px",
          background: "#f9fafb",
          overflowY: "auto",
          width: "100%",
        }}
      >
        {isMobile && (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <h2 style={{ margin: 0 }}>Jobs-Flow</h2>

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                style={{
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  borderRadius: "10px",
                  padding: "10px 14px",
                  fontSize: "22px",
                  lineHeight: 1,
                  cursor: "pointer",
                }}
                aria-label="Menü öffnen"
              >
                ☰
              </button>
            </div>

            {mobileMenuOpen && (
              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid #d1d5db",
                  borderRadius: "12px",
                  padding: "12px",
                  marginBottom: "16px",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
                }}
              >
                <SidebarButton
                  active={activeTool === "service-text"}
                  onClick={() => handleSelectTool("service-text")}
                  label="Service Text"
                />

                <SidebarButton
                  active={activeTool === "text-generator"}
                  onClick={() => handleSelectTool("text-generator")}
                  label="Text Generator"
                />

                <SidebarButton
                  active={activeTool === "photo-mail"}
                  onClick={() => handleSelectTool("photo-mail")}
                  label="Kaltakquise-Mails"
                />

                <SidebarButton
                  active={activeTool === "bulk-mail"}
                  onClick={() => handleSelectTool("bulk-mail")}
                  label="Streumails"
                />

                <SidebarButton
                  active={activeTool === "crm"}
                  onClick={() => handleSelectTool("crm")}
                  label="CRM"
                />

                <SidebarButton
                  active={activeTool === "prompts-text"}
                  onClick={() => handleSelectTool("prompts-text")}
                  label="Prompts & Texte"
                />
              </div>
            )}
          </>
        )}

        {activeTool === "service-text" && <ServiceText isMobile={isMobile} />}
        {activeTool === "text-generator" && (
          <TextGeneratorPlaceholder isMobile={isMobile} />
        )}
        {activeTool === "photo-mail" && <ColdMailPage serviceMode="cold" />}
        {activeTool === "bulk-mail" && <BulkMailPage />}
        {activeTool === "crm" && <CrmPage />}
        {activeTool === "prompts-text" && <PromptsTextPage />}
      </main>
    </div>
  );
}

function SidebarButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        padding: "12px 14px",
        marginBottom: "10px",
        border: "none",
        borderRadius: "10px",
        background: active ? "#111827" : "transparent",
        color: active ? "#ffffff" : "#111827",
        cursor: "pointer",
        fontSize: "16px",
      }}
    >
      {label}
    </button>
  );
}

function ServiceText({ isMobile }: { isMobile: boolean }) {
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

    if (!theme.trim()) {
      setError("Bitte ein Thema eingeben.");
      return;
    }

    try {
      setLoading(true);

      const [res1, res2] = await Promise.all([
        fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            theme,
            properties,
            count,
            taskTemplate: activeTask,
          }),
        }),
        fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
      <div
        style={{
          display: "flex",
          alignItems: isMobile ? "flex-start" : "center",
          flexDirection: isMobile ? "column" : "row",
          gap: "12px",
          marginBottom: "18px",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "18px" }}>Service Text</h1>

        <button
          onClick={() => setShowInfo(!showInfo)}
          style={{
            padding: "8px 12px",
            border: "1px solid #cbd5e1",
            borderRadius: "8px",
            background: "#ffffff",
            cursor: "pointer",
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
            flexDirection: isMobile ? "column" : "row",
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
                resize: "vertical",
                minHeight: "180px",
                lineHeight: 1.5,
                boxSizing: "border-box",
                width: "100%",
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
          padding: isMobile ? "16px" : "24px",
          maxWidth: "760px",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <label style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}>
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
            boxSizing: "border-box",
          }}
        />

        <label style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}>
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
            boxSizing: "border-box",
          }}
        />

        <label style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}>
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
              boxSizing: "border-box",
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
        <div style={{ marginTop: "16px", color: "#b91c1c", fontWeight: 600 }}>
          {error}
        </div>
      ) : null}

      {variantResults.length === 2 ? (
        <div
          style={{
            marginTop: "24px",
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            gap: "20px",
            maxWidth: "1100px",
            flexWrap: "wrap",
          }}
        >
          <OutputBox
            text={variantResults[0]}
            copied={copiedVariant1}
            onCopy={() => copyToClipboard(variantResults[0], "v1")}
            footer={`Ziel: ${count} Wörter${variantCounts[0] > 0 ? ` • Ist: ${variantCounts[0]} Wörter` : ""}`}
            placeholder="Hier erscheint Variante 1."
          />

          <OutputBox
            text={variantResults[1]}
            copied={copiedVariant2}
            onCopy={() => copyToClipboard(variantResults[1], "v2")}
            footer={`Ziel: ${count} Wörter${variantCounts[1] > 0 ? ` • Ist: ${variantCounts[1]} Wörter` : ""}`}
            placeholder="Hier erscheint Variante 2."
          />
        </div>
      ) : (
        <>
          <div style={{ marginTop: "24px", maxWidth: "900px" }}>
            <OutputBox
              text={result}
              copied={copiedSingle}
              onCopy={() => copyToClipboard(result, "single")}
              placeholder="Hier erscheint der generierte Text."
            />
          </div>

          <div style={{ marginTop: "10px", color: "#6b7280", fontSize: "14px" }}>
            Ziel: {count} Wörter
            {actualCount > 0 ? ` • Ist: ${actualCount} Wörter` : ""}
          </div>
        </>
      )}
    </div>
  );
}

function OutputBox({
  text,
  copied,
  onCopy,
  placeholder,
  footer,
}: {
  text: string;
  copied: boolean;
  onCopy: () => void;
  placeholder: string;
  footer?: string;
}) {
  return (
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
        minWidth: "0",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <button
        onClick={onCopy}
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
        {copied ? "✓" : "📋"}
      </button>

      <div
        style={{
          paddingRight: "40px",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {text || placeholder}
      </div>

      {footer ? (
        <div style={{ marginTop: "10px", color: "#6b7280", fontSize: "14px" }}>
          {footer}
        </div>
      ) : null}
    </div>
  );
}

function TextGeneratorPlaceholder({ isMobile }: { isMobile: boolean }) {
  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Text Generator</h1>
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #d1d5db",
          borderRadius: "12px",
          padding: isMobile ? "16px" : "24px",
          maxWidth: "700px",
        }}
      >
        Kommt als nächstes...
      </div>
    </div>
  );
}
