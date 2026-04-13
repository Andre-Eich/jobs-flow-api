"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

type SocialPostTab = "content" | "template";
type SocialPostFormatId = "format-a";
type SocialPostElementKey =
  | "company"
  | "jobTitle"
  | "location"
  | "employment"
  | "highlight"
  | "logo"
  | "teaserImage"
  | "branding"
  | "cta";

type SocialPostElementConfig = {
  visible: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  color: string;
  textAlign: "left" | "center" | "right";
  objectFit: "cover" | "contain";
};

type SocialPostTemplate = {
  formatId: SocialPostFormatId;
  name: string;
  width: number;
  height: number;
  backgroundImage: string;
  updatedAt: string;
  elements: Record<SocialPostElementKey, SocialPostElementConfig>;
};

type ExtractedSocialPostData = {
  company: string;
  jobTitle: string;
  location: string;
  employment: string;
  highlight: string;
  logoUrl: string;
  teaserImageUrl: string;
  link: string;
  shortText: string;
  captionText: string;
};

type DragState = {
  type: "move" | "resize";
  key: SocialPostElementKey;
  startMouseX: number;
  startMouseY: number;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
};

const ELEMENT_LABELS: Array<{ key: SocialPostElementKey; label: string; kind: "text" | "image" }> = [
  { key: "company", label: "Firmenname", kind: "text" },
  { key: "jobTitle", label: "Jobtitel", kind: "text" },
  { key: "location", label: "Ort", kind: "text" },
  { key: "employment", label: "Arbeitszeit / Vertragsart", kind: "text" },
  { key: "highlight", label: "Highlight / Benefit", kind: "text" },
  { key: "logo", label: "Logo", kind: "image" },
  { key: "teaserImage", label: "Arbeitgeberbild / Teaserbild", kind: "image" },
  { key: "branding", label: "Branding", kind: "text" },
  { key: "cta", label: "CTA", kind: "text" },
];

const SAMPLE_DATA: ExtractedSocialPostData = {
  company: "IHK Ostbrandenburg",
  jobTitle: "Referent Wirtschaftspolitik (m/w/d)",
  location: "Frankfurt (Oder)",
  employment: "Vollzeit, unbefristet",
  highlight: "Hoher Gestaltungsspielraum und direkte Wirkung auf wirtschaftspolitische Entscheidungsprozesse",
  logoUrl: "",
  teaserImageUrl: "",
  link: "https://jobs-in-berlin-brandenburg.de/",
  shortText:
    "Referent Wirtschaftspolitik (m/w/d) bei IHK Ostbrandenburg. Frankfurt (Oder) • Vollzeit, unbefristet • Hoher Gestaltungsspielraum und direkte Wirkung auf wirtschaftspolitische Entscheidungsprozesse",
  captionText:
    "Die IHK Ostbrandenburg sucht einen Referenten Wirtschaftspolitik (m/w/d) in Frankfurt (Oder) – eine Stelle mit echtem Gestaltungsspielraum. Jetzt bewerben und Teil der regionalen Wirtschaftsförderung werden.",
};

function formatDate(dateString: string) {
  try {
    return new Date(dateString).toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateString;
  }
}

function tabButtonStyle(active: boolean): React.CSSProperties {
  return {
    padding: "10px 14px",
    borderRadius: "999px",
    border: `1px solid ${active ? "#111827" : "#cbd5e1"}`,
    background: active ? "#111827" : "#ffffff",
    color: active ? "#ffffff" : "#111827",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 700,
  };
}

function panelStyle(): React.CSSProperties {
  return {
    background: "#ffffff",
    border: "1px solid #d1d5db",
    borderRadius: "16px",
    padding: "18px",
    boxSizing: "border-box",
  };
}

function buildElementText(key: SocialPostElementKey, data: ExtractedSocialPostData) {
  if (key === "company") return data.company;
  if (key === "jobTitle") return data.jobTitle;
  if (key === "location") return data.location;
  if (key === "employment") return data.employment;
  if (key === "highlight") return data.highlight;
  if (key === "branding") return "jobs-in-berlin-brandenburg.de";
  if (key === "cta") return "Jetzt bewerben";
  return "";
}

function buildImageSource(key: SocialPostElementKey, data: ExtractedSocialPostData) {
  if (key === "logo") return data.logoUrl;
  if (key === "teaserImage") return data.teaserImageUrl;
  return "";
}

// Statische Vorschau – verwendet im Content-Tab (nicht interaktiv)
function SocialPostPreview({
  template,
  data,
  selectedElements,
}: {
  template: SocialPostTemplate;
  data: ExtractedSocialPostData;
  selectedElements?: Record<SocialPostElementKey, boolean>;
}) {
  const scale = 420 / template.width;

  return (
    <div
      style={{
        width: template.width * scale,
        height: template.height * scale,
        position: "relative",
        borderRadius: "18px",
        overflow: "hidden",
        background: template.backgroundImage
          ? `center / cover no-repeat url(${template.backgroundImage})`
          : "linear-gradient(160deg, #0f172a, #334155)",
        boxShadow: "0 12px 30px rgba(15, 23, 42, 0.18)",
      }}
    >
      {!template.backgroundImage ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(145deg, rgba(15, 23, 42, 0.28), rgba(37, 99, 235, 0.16))",
          }}
        />
      ) : null}

      {ELEMENT_LABELS.map((element) => {
        const config = template.elements[element.key];
        const selected = selectedElements ? selectedElements[element.key] : true;
        if (!config.visible || !selected) return null;

        const left = config.x * scale;
        const top = config.y * scale;
        const width = config.width * scale;
        const height = config.height * scale;

        if (element.kind === "image") {
          const src = buildImageSource(element.key, data);
          return (
            <div
              key={element.key}
              style={{
                position: "absolute",
                left,
                top,
                width,
                height,
                borderRadius: "14px",
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.22)",
                background: "rgba(255,255,255,0.12)",
                backdropFilter: "blur(4px)",
              }}
            >
              {src ? (
                <Image
                  src={src}
                  alt={element.label}
                  fill
                  unoptimized
                  style={{ objectFit: config.objectFit }}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#ffffff",
                    fontSize: "12px",
                    textAlign: "center",
                    padding: "10px",
                    boxSizing: "border-box",
                  }}
                >
                  {element.label}
                </div>
              )}
            </div>
          );
        }

        const text = buildElementText(element.key, data);
        return (
          <div
            key={element.key}
            style={{
              position: "absolute",
              left,
              top,
              width,
              height,
              color: config.color,
              fontSize: config.fontSize * scale,
              textAlign: config.textAlign,
              lineHeight: 1.15,
              fontWeight: element.key === "jobTitle" ? 700 : 500,
              whiteSpace: "pre-wrap",
              overflow: "hidden",
              textShadow: "0 2px 10px rgba(15, 23, 42, 0.45)",
            }}
          >
            {text}
          </div>
        );
      })}
    </div>
  );
}

// Interaktiver Canvas – verwendet im Template-Tab
function SocialPostTemplateCanvas({
  template,
  data,
  activeElement,
  onSelectElement,
  onUpdateElement,
}: {
  template: SocialPostTemplate;
  data: ExtractedSocialPostData;
  activeElement: SocialPostElementKey;
  onSelectElement: (key: SocialPostElementKey) => void;
  onUpdateElement: (key: SocialPostElementKey, patch: Partial<SocialPostElementConfig>) => void;
}) {
  const scale = 420 / template.width;
  const [drag, setDrag] = useState<DragState | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  function handleElementMouseDown(
    event: React.MouseEvent,
    key: SocialPostElementKey,
    type: "move" | "resize"
  ) {
    event.preventDefault();
    event.stopPropagation();
    onSelectElement(key);
    const config = template.elements[key];
    setDrag({
      type,
      key,
      startMouseX: event.clientX,
      startMouseY: event.clientY,
      startX: config.x,
      startY: config.y,
      startWidth: config.width,
      startHeight: config.height,
    });
  }

  function handleMouseMove(event: React.MouseEvent) {
    if (!drag) return;
    const dx = (event.clientX - drag.startMouseX) / scale;
    const dy = (event.clientY - drag.startMouseY) / scale;

    if (drag.type === "move") {
      onUpdateElement(drag.key, {
        x: Math.round(drag.startX + dx),
        y: Math.round(drag.startY + dy),
      });
    } else {
      onUpdateElement(drag.key, {
        width: Math.max(40, Math.round(drag.startWidth + dx)),
        height: Math.max(20, Math.round(drag.startHeight + dy)),
      });
    }
  }

  function handleMouseUp() {
    setDrag(null);
  }

  const canvasWidth = template.width * scale;
  const canvasHeight = template.height * scale;

  return (
    <div
      ref={canvasRef}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{
        width: canvasWidth,
        height: canvasHeight,
        position: "relative",
        borderRadius: "18px",
        overflow: "hidden",
        background: template.backgroundImage
          ? `center / cover no-repeat url(${template.backgroundImage})`
          : "linear-gradient(160deg, #0f172a, #334155)",
        boxShadow: "0 12px 30px rgba(15, 23, 42, 0.18)",
        userSelect: "none",
        cursor: drag?.type === "move" ? "grabbing" : "default",
        flexShrink: 0,
      }}
    >
      {!template.backgroundImage ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(145deg, rgba(15, 23, 42, 0.28), rgba(37, 99, 235, 0.16))",
          }}
        />
      ) : null}

      {ELEMENT_LABELS.map((element) => {
        const config = template.elements[element.key];
        if (!config.visible) return null;

        const isActive = activeElement === element.key;
        const left = config.x * scale;
        const top = config.y * scale;
        const width = config.width * scale;
        const height = config.height * scale;

        const text = element.kind === "text" ? buildElementText(element.key, data) : "";
        const imgSrc = element.kind === "image" ? buildImageSource(element.key, data) : "";

        return (
          <div
            key={element.key}
            onMouseDown={(e) => handleElementMouseDown(e, element.key, "move")}
            style={{
              position: "absolute",
              left,
              top,
              width,
              height,
              cursor: drag && drag.key === element.key && drag.type === "move" ? "grabbing" : "grab",
              outline: isActive
                ? "2px solid #3b82f6"
                : "1px solid rgba(255,255,255,0.10)",
              outlineOffset: isActive ? "1px" : "0px",
              borderRadius: element.kind === "image" ? "14px" : "4px",
              overflow: "hidden",
              boxSizing: "border-box",
              ...(element.kind === "image"
                ? {
                    background: "rgba(255,255,255,0.12)",
                    backdropFilter: "blur(4px)",
                  }
                : {}),
            }}
          >
            {element.kind === "image" ? (
              imgSrc ? (
                <Image
                  src={imgSrc}
                  alt={element.label}
                  fill
                  unoptimized
                  style={{ objectFit: config.objectFit, pointerEvents: "none" }}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#ffffff",
                    fontSize: Math.max(10, 12 * scale),
                    textAlign: "center",
                    padding: "6px",
                    boxSizing: "border-box",
                    pointerEvents: "none",
                    opacity: 0.7,
                  }}
                >
                  {element.label}
                </div>
              )
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  color: config.color,
                  fontSize: config.fontSize * scale,
                  textAlign: config.textAlign,
                  lineHeight: 1.15,
                  fontWeight: element.key === "jobTitle" ? 700 : 500,
                  whiteSpace: "pre-wrap",
                  overflow: "hidden",
                  textShadow: "0 2px 10px rgba(15, 23, 42, 0.45)",
                  pointerEvents: "none",
                  padding: "2px",
                  boxSizing: "border-box",
                }}
              >
                {text}
              </div>
            )}

            {/* Resize-Handle unten rechts */}
            {isActive && (
              <div
                onMouseDown={(e) => handleElementMouseDown(e, element.key, "resize")}
                title="Größe ändern"
                style={{
                  position: "absolute",
                  bottom: 0,
                  right: 0,
                  width: 14,
                  height: 14,
                  background: "#3b82f6",
                  borderRadius: "4px 0 4px 0",
                  cursor: "nwse-resize",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <path d="M7 1L1 7M7 4L4 7" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
            )}

            {/* Label beim aktiven Element */}
            {isActive && (
              <div
                style={{
                  position: "absolute",
                  top: -20,
                  left: 0,
                  background: "#3b82f6",
                  color: "#fff",
                  fontSize: 10,
                  padding: "1px 5px",
                  borderRadius: "4px 4px 0 0",
                  whiteSpace: "nowrap",
                  pointerEvents: "none",
                }}
              >
                {ELEMENT_LABELS.find((el) => el.key === element.key)?.label}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function SocialPostsPage() {
  const [activeTab, setActiveTab] = useState<SocialPostTab>("content");
  const [formatId, setFormatId] = useState<SocialPostFormatId>("format-a");
  const [template, setTemplate] = useState<SocialPostTemplate | null>(null);
  const [templateDraft, setTemplateDraft] = useState<SocialPostTemplate | null>(null);
  const [activeElement, setActiveElement] = useState<SocialPostElementKey>("company");
  const [sourceUrl, setSourceUrl] = useState(
    "https://jobs-in-berlin-brandenburg.de/stellenangebot/referenten-wirtschaftspolitik-mwd-frankfurt-oder-ihk-ostbrandenburg-3164157/"
  );
  const [selectedElements, setSelectedElements] = useState<Record<SocialPostElementKey, boolean>>({
    company: true,
    jobTitle: true,
    location: true,
    employment: true,
    highlight: true,
    logo: true,
    teaserImage: true,
    branding: true,
    cta: true,
  });
  const [extractedData, setExtractedData] = useState<ExtractedSocialPostData | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [loadingContent, setLoadingContent] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function loadTemplate(nextFormat: SocialPostFormatId) {
    try {
      setLoadingTemplate(true);
      const response = await fetch(`/api/social-posts/template?format=${nextFormat}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Template konnte nicht geladen werden.");
        return;
      }

      setTemplate(data.template);
      setTemplateDraft(data.template);
    } catch {
      setError("Template konnte nicht geladen werden.");
    } finally {
      setLoadingTemplate(false);
    }
  }

  useEffect(() => {
    loadTemplate(formatId);
  }, [formatId]);

  const activeElementConfig = useMemo(
    () => (templateDraft ? templateDraft.elements[activeElement] : null),
    [templateDraft, activeElement]
  );

  async function handleBackgroundUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !templateDraft) return;

    const reader = new FileReader();
    reader.onload = () => {
      setTemplateDraft((prev) => (prev ? { ...prev, backgroundImage: String(reader.result || "") } : prev));
    };
    reader.readAsDataURL(file);
  }

  function updateElementConfig(
    key: SocialPostElementKey,
    patch: Partial<SocialPostElementConfig>
  ) {
    setTemplateDraft((prev) =>
      prev
        ? {
            ...prev,
            elements: {
              ...prev.elements,
              [key]: {
                ...prev.elements[key],
                ...patch,
              },
            },
          }
        : prev
    );
  }

  async function saveTemplate() {
    if (!templateDraft) return;

    try {
      setSavingTemplate(true);
      setError("");
      setSuccessMessage("");

      const response = await fetch("/api/social-posts/template", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(templateDraft),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Template konnte nicht gespeichert werden.");
        return;
      }

      setTemplate(data.template);
      setTemplateDraft(data.template);
      setSuccessMessage("Template wurde gespeichert und bleibt fuer kuenftige Social Posts erhalten.");
    } catch {
      setError("Template konnte nicht gespeichert werden.");
    } finally {
      setSavingTemplate(false);
    }
  }

  async function analyzeUrl() {
    try {
      setLoadingContent(true);
      setError("");
      setSuccessMessage("");

      const response = await fetch("/api/social-posts/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: sourceUrl }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Die Stellenanzeige konnte nicht ausgewertet werden.");
        return;
      }

      setExtractedData(data.data);
      setSuccessMessage("Stellenanzeige geladen und fuer das gespeicherte Template vorbereitet.");
    } catch {
      setError("Die Stellenanzeige konnte nicht ausgewertet werden.");
    } finally {
      setLoadingContent(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
      <div>
        <h1 style={{ margin: 0, fontSize: "22px" }}>Social Posts</h1>
        <div style={{ marginTop: "8px", color: "#6b7280", fontSize: "14px", maxWidth: "860px" }}>
          Verwalte ein dauerhaft gespeichertes Bild-Template und erzeuge daraus Social Content aus
          Stellenanzeigen-URLs.
        </div>
      </div>

      <div style={{ ...panelStyle(), display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <button type="button" onClick={() => setActiveTab("content")} style={tabButtonStyle(activeTab === "content")}>
          Content erstellen
        </button>
        <button type="button" onClick={() => setActiveTab("template")} style={tabButtonStyle(activeTab === "template")}>
          Template bearbeiten
        </button>
      </div>

      {error ? <div style={{ color: "#b91c1c", fontWeight: 600 }}>{error}</div> : null}
      {successMessage ? <div style={{ color: "#166534", fontWeight: 600 }}>{successMessage}</div> : null}

      {activeTab === "template" ? (
        <div style={{ display: "flex", gap: "18px", alignItems: "flex-start", flexWrap: "wrap" }}>
          {/* Linkes Panel: Einstellungen */}
          <div style={{ ...panelStyle(), width: 300, flexShrink: 0 }}>
            <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "16px" }}>Einstellungen</div>

            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}>Format</label>
              <select
                value={formatId}
                onChange={(event) => setFormatId(event.target.value === "format-a" ? "format-a" : "format-a")}
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", background: "#ffffff" }}
              >
                <option value="format-a">Format A (1200 x 1200)</option>
              </select>
            </div>

            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}>Hintergrundbild hochladen</label>
              <input type="file" accept="image/*" onChange={handleBackgroundUpload} />
              <div style={{ marginTop: "8px", fontSize: "12px", color: "#6b7280" }}>
                Wird zusammen mit den Positionen gespeichert.
              </div>
            </div>

            <div style={{ marginBottom: "14px" }}>
              <div style={{ fontWeight: 600, marginBottom: "8px" }}>Element anklicken oder hier wählen</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {ELEMENT_LABELS.map((element) => (
                  <button
                    key={element.key}
                    type="button"
                    onClick={() => setActiveElement(element.key)}
                    style={{
                      padding: "5px 10px",
                      borderRadius: "999px",
                      border: `1px solid ${activeElement === element.key ? "#3b82f6" : "#cbd5e1"}`,
                      background: activeElement === element.key ? "#eff6ff" : "#ffffff",
                      color: activeElement === element.key ? "#1d4ed8" : "#111827",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: activeElement === element.key ? 700 : 400,
                    }}
                  >
                    {element.label}
                  </button>
                ))}
              </div>
            </div>

            {activeElementConfig ? (
              <div style={{ display: "grid", gap: "12px", borderTop: "1px solid #e5e7eb", paddingTop: "14px" }}>
                <div style={{ fontWeight: 600, fontSize: "14px", color: "#374151" }}>
                  {ELEMENT_LABELS.find((el) => el.key === activeElement)?.label}
                </div>

                <label style={{ fontSize: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <input
                    type="checkbox"
                    checked={activeElementConfig.visible}
                    onChange={(event) => updateElementConfig(activeElement, { visible: event.target.checked })}
                  />
                  Sichtbar
                </label>

                {/* Nur Styling-Optionen — keine Koordinaten-Inputs */}
                {ELEMENT_LABELS.find((el) => el.key === activeElement)?.kind === "text" ? (
                  <>
                    <div>
                      <label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>Schriftgröße</label>
                      <input
                        type="number"
                        value={activeElementConfig.fontSize}
                        onChange={(event) => updateElementConfig(activeElement, { fontSize: Number(event.target.value) })}
                        style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "8px", boxSizing: "border-box" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>Farbe</label>
                      <input
                        type="color"
                        value={activeElementConfig.color}
                        onChange={(event) => updateElementConfig(activeElement, { color: event.target.value })}
                        style={{ width: "100%", height: "42px", border: "1px solid #cbd5e1", borderRadius: "8px" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>Ausrichtung</label>
                      <select
                        value={activeElementConfig.textAlign}
                        onChange={(event) =>
                          updateElementConfig(activeElement, {
                            textAlign:
                              event.target.value === "center" || event.target.value === "right"
                                ? event.target.value
                                : "left",
                          })
                        }
                        style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", background: "#ffffff" }}
                      >
                        <option value="left">Links</option>
                        <option value="center">Zentriert</option>
                        <option value="right">Rechts</option>
                      </select>
                    </div>
                  </>
                ) : (
                  <div>
                    <label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>Bildmodus</label>
                    <select
                      value={activeElementConfig.objectFit}
                      onChange={(event) =>
                        updateElementConfig(activeElement, {
                          objectFit: event.target.value === "contain" ? "contain" : "cover",
                        })
                      }
                      style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", background: "#ffffff" }}
                    >
                      <option value="cover">Cover (füllt Bereich)</option>
                      <option value="contain">Contain (zeigt Ganzes)</option>
                    </select>
                  </div>
                )}

                {/* Position + Größe als Readonly-Info */}
                <div style={{ fontSize: "12px", color: "#9ca3af", lineHeight: 1.6 }}>
                  x: {activeElementConfig.x} · y: {activeElementConfig.y}
                  {" "}· {activeElementConfig.width} × {activeElementConfig.height} px
                </div>
              </div>
            ) : null}

            <div style={{ marginTop: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={saveTemplate}
                disabled={savingTemplate || !templateDraft}
                style={{
                  padding: "10px 14px",
                  border: "none",
                  borderRadius: "8px",
                  background: "#111827",
                  color: "#ffffff",
                  cursor: savingTemplate ? "not-allowed" : "pointer",
                  opacity: savingTemplate ? 0.7 : 1,
                }}
              >
                {savingTemplate ? "Speichert..." : "Template speichern"}
              </button>
              {template ? (
                <button
                  type="button"
                  onClick={() => setTemplateDraft(template)}
                  style={{ padding: "10px 14px", border: "1px solid #cbd5e1", borderRadius: "8px", background: "#ffffff", cursor: "pointer" }}
                >
                  Gespeicherten Stand laden
                </button>
              ) : null}
            </div>
          </div>

          {/* Rechtes Panel: Interaktiver Canvas */}
          <div style={{ ...panelStyle(), flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", marginBottom: "12px", flexWrap: "wrap", alignItems: "flex-end" }}>
              <div>
                <div style={{ fontSize: "18px", fontWeight: 700 }}>Canvas</div>
                <div style={{ marginTop: "4px", color: "#6b7280", fontSize: "13px" }}>
                  Elemente verschieben per Drag · Größe ändern am blauen Handle rechts unten
                </div>
              </div>
              <div style={{ fontSize: "12px", color: "#6b7280" }}>
                {templateDraft ? `Zuletzt gespeichert: ${formatDate(templateDraft.updatedAt)}` : ""}
              </div>
            </div>

            {loadingTemplate || !templateDraft ? (
              <div style={{ color: "#6b7280" }}>Template wird geladen...</div>
            ) : (
              <SocialPostTemplateCanvas
                template={templateDraft}
                data={SAMPLE_DATA}
                activeElement={activeElement}
                onSelectElement={setActiveElement}
                onUpdateElement={updateElementConfig}
              />
            )}
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(320px, 440px) 1fr", gap: "18px" }}>
          <div style={panelStyle()}>
            <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "16px" }}>Content erstellen</div>
            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}>URL der Stellenanzeige</label>
              <input
                value={sourceUrl}
                onChange={(event) => setSourceUrl(event.target.value)}
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", boxSizing: "border-box" }}
              />
            </div>
            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}>Format</label>
              <select
                value={formatId}
                onChange={(event) => setFormatId(event.target.value === "format-a" ? "format-a" : "format-a")}
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", background: "#ffffff" }}
              >
                <option value="format-a">Format A (1200 x 1200)</option>
              </select>
            </div>

            <div style={{ marginBottom: "14px" }}>
              <div style={{ fontWeight: 600, marginBottom: "8px" }}>Elemente übernehmen</div>
              <div style={{ display: "grid", gap: "8px" }}>
                {ELEMENT_LABELS.map((element) => (
                  <label key={element.key} style={{ fontSize: "14px" }}>
                    <input
                      type="checkbox"
                      checked={selectedElements[element.key]}
                      onChange={(event) =>
                        setSelectedElements((prev) => ({
                          ...prev,
                          [element.key]: event.target.checked,
                        }))
                      }
                      style={{ marginRight: "6px" }}
                    />
                    {element.label}
                  </label>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={analyzeUrl}
              disabled={loadingContent}
              style={{
                padding: "10px 14px",
                border: "none",
                borderRadius: "8px",
                background: "#111827",
                color: "#ffffff",
                cursor: loadingContent ? "not-allowed" : "pointer",
                opacity: loadingContent ? 0.7 : 1,
              }}
            >
              {loadingContent ? "Analysiert..." : "URL laden und Content vorbereiten"}
            </button>

            {extractedData ? (
              <div style={{ marginTop: "18px", borderTop: "1px solid #e5e7eb", paddingTop: "18px", display: "grid", gap: "10px", fontSize: "14px" }}>
                <PreviewRow label="Firmenname" value={extractedData.company || "-"} />
                <PreviewRow label="Jobtitel" value={extractedData.jobTitle || "-"} />
                <PreviewRow label="Ort" value={extractedData.location || "-"} />
                <PreviewRow label="Arbeitszeit / Vertragsart" value={extractedData.employment || "-"} />
                <PreviewRow label="Highlight" value={extractedData.highlight || "-"} />
                <PreviewRow label="Logo" value={extractedData.logoUrl || "-"} />
                <PreviewRow label="Teaserbild" value={extractedData.teaserImageUrl || "-"} />
                <PreviewRow label="Link" value={extractedData.link || "-"} />
              </div>
            ) : null}
          </div>

          <div style={{ display: "grid", gap: "18px" }}>
            <div style={panelStyle()}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", marginBottom: "16px", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: "18px", fontWeight: 700 }}>Bild-Vorschau</div>
                  <div style={{ marginTop: "6px", color: "#6b7280", fontSize: "13px" }}>
                    Das zuletzt gespeicherte Template des gewählten Formats wird automatisch verwendet.
                  </div>
                </div>
                <div style={{ fontSize: "12px", color: "#6b7280" }}>
                  {template ? `Template-Stand: ${formatDate(template.updatedAt)}` : ""}
                </div>
              </div>

              {template && extractedData ? (
                <>
                  <SocialPostPreview template={template} data={extractedData} selectedElements={selectedElements} />
                  <div style={{ marginTop: "14px" }}>
                    <button
                      type="button"
                      onClick={() => {
                        const imgUrl = extractedData.teaserImageUrl;
                        if (imgUrl) {
                          window.open(imgUrl, "_blank", "noopener,noreferrer");
                        } else {
                          alert("Kein Bild verfügbar.");
                        }
                      }}
                      style={{
                        padding: "10px 18px",
                        border: "none",
                        borderRadius: "8px",
                        background: "#111827",
                        color: "#ffffff",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: 600,
                      }}
                    >
                      Bild speichern
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ color: "#6b7280" }}>
                  Lade zuerst eine Stellenanzeige und stelle sicher, dass ein Template gespeichert ist.
                </div>
              )}
            </div>

            <CaptionPanel captionText={extractedData?.captionText || extractedData?.shortText || ""} />
          </div>
        </div>
      )}
    </div>
  );
}

function CaptionPanel({ captionText }: { captionText: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!captionText) return;
    try {
      await navigator.clipboard.writeText(captionText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  return (
    <div style={{ ...panelStyle() }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", gap: "12px" }}>
        <div style={{ fontSize: "18px", fontWeight: 700 }}>Post-Text</div>
        <button
          type="button"
          onClick={handleCopy}
          disabled={!captionText}
          style={{
            padding: "8px 14px",
            border: "1px solid #cbd5e1",
            borderRadius: "8px",
            background: copied ? "#f0fdf4" : "#ffffff",
            color: copied ? "#166534" : "#111827",
            cursor: captionText ? "pointer" : "not-allowed",
            fontSize: "13px",
            fontWeight: 600,
            opacity: captionText ? 1 : 0.5,
            whiteSpace: "nowrap",
          }}
        >
          {copied ? "Kopiert ✓" : "Text kopieren"}
        </button>
      </div>
      <div style={{ color: "#000000", lineHeight: 1.7, fontSize: "15px" }}>
        {captionText || "Hier erscheint der generierte Post-Text nach dem Laden einer Stellenanzeige."}
      </div>
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "170px 1fr", gap: "12px" }}>
      <div style={{ color: "#6b7280" }}>{label}</div>
      <div style={{ wordBreak: "break-word" }}>{value}</div>
    </div>
  );
}
