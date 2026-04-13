"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

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
        <div style={{ display: "grid", gridTemplateColumns: "minmax(320px, 420px) 1fr", gap: "18px" }}>
          <div style={panelStyle()}>
            <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "16px" }}>Template bearbeiten</div>
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
              <label style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}>Template-Bild hochladen</label>
              <input type="file" accept="image/*" onChange={handleBackgroundUpload} />
              <div style={{ marginTop: "8px", fontSize: "12px", color: "#6b7280" }}>
                Das Hintergrundbild wird zusammen mit den Positionen dauerhaft gespeichert.
              </div>
            </div>

            <div style={{ marginBottom: "14px" }}>
              <div style={{ fontWeight: 600, marginBottom: "8px" }}>Element waehlen</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {ELEMENT_LABELS.map((element) => (
                  <button
                    key={element.key}
                    type="button"
                    onClick={() => setActiveElement(element.key)}
                    style={tabButtonStyle(activeElement === element.key)}
                  >
                    {element.label}
                  </button>
                ))}
              </div>
            </div>

            {activeElementConfig ? (
              <div style={{ display: "grid", gap: "10px" }}>
                <label style={{ fontSize: "14px" }}>
                  <input
                    type="checkbox"
                    checked={activeElementConfig.visible}
                    onChange={(event) => updateElementConfig(activeElement, { visible: event.target.checked })}
                    style={{ marginRight: "6px" }}
                  />
                  Sichtbar
                </label>
                <NumberInput
                  label="Position X"
                  value={activeElementConfig.x}
                  onChange={(value) => updateElementConfig(activeElement, { x: value })}
                />
                <NumberInput
                  label="Position Y"
                  value={activeElementConfig.y}
                  onChange={(value) => updateElementConfig(activeElement, { y: value })}
                />
                <NumberInput
                  label="Breite"
                  value={activeElementConfig.width}
                  onChange={(value) => updateElementConfig(activeElement, { width: value })}
                />
                <NumberInput
                  label="Hoehe"
                  value={activeElementConfig.height}
                  onChange={(value) => updateElementConfig(activeElement, { height: value })}
                />
                <NumberInput
                  label="Schriftgroesse"
                  value={activeElementConfig.fontSize}
                  onChange={(value) => updateElementConfig(activeElement, { fontSize: value })}
                />
                <div>
                  <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>Farbe</label>
                  <input
                    type="color"
                    value={activeElementConfig.color}
                    onChange={(event) => updateElementConfig(activeElement, { color: event.target.value })}
                    style={{ width: "100%", height: "42px", border: "1px solid #cbd5e1", borderRadius: "8px" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>Ausrichtung</label>
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
                    <option value="left">links</option>
                    <option value="center">zentriert</option>
                    <option value="right">rechts</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>Bildmodus</label>
                  <select
                    value={activeElementConfig.objectFit}
                    onChange={(event) =>
                      updateElementConfig(activeElement, {
                        objectFit: event.target.value === "contain" ? "contain" : "cover",
                      })
                    }
                    style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", background: "#ffffff" }}
                  >
                    <option value="cover">cover</option>
                    <option value="contain">contain</option>
                  </select>
                </div>
              </div>
            ) : null}

            <div style={{ marginTop: "18px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={saveTemplate}
                disabled={savingTemplate || !templateDraft}
                style={{ padding: "10px 14px", border: "none", borderRadius: "8px", background: "#111827", color: "#ffffff", cursor: savingTemplate ? "not-allowed" : "pointer", opacity: savingTemplate ? 0.7 : 1 }}
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

          <div style={panelStyle()}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", marginBottom: "16px", flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: "18px", fontWeight: 700 }}>Template-Vorschau</div>
                <div style={{ marginTop: "6px", color: "#6b7280", fontSize: "13px" }}>
                  Format A nutzt aktuell 1200 x 1200 und kann spaeter um weitere Formate erweitert werden.
                </div>
              </div>
              <div style={{ fontSize: "12px", color: "#6b7280" }}>
                {templateDraft ? `Zuletzt gespeichert: ${formatDate(templateDraft.updatedAt)}` : ""}
              </div>
            </div>

            {loadingTemplate || !templateDraft ? (
              <div style={{ color: "#6b7280" }}>Template wird geladen...</div>
            ) : (
              <SocialPostPreview template={templateDraft} data={SAMPLE_DATA} />
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
              <div style={{ fontWeight: 600, marginBottom: "8px" }}>Elemente uebernehmen</div>
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
              style={{ padding: "10px 14px", border: "none", borderRadius: "8px", background: "#111827", color: "#ffffff", cursor: loadingContent ? "not-allowed" : "pointer", opacity: loadingContent ? 0.7 : 1 }}
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
                    Das zuletzt gespeicherte Template des gewaehlten Formats wird automatisch verwendet.
                  </div>
                </div>
                <div style={{ fontSize: "12px", color: "#6b7280" }}>
                  {template ? `Template-Stand: ${formatDate(template.updatedAt)}` : ""}
                </div>
              </div>

              {template && extractedData ? (
                <SocialPostPreview template={template} data={extractedData} selectedElements={selectedElements} />
              ) : (
                <div style={{ color: "#6b7280" }}>
                  Lade zuerst eine Stellenanzeige und stelle sicher, dass ein Template gespeichert ist.
                </div>
              )}
            </div>

            <div style={panelStyle()}>
              <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "10px" }}>Kurztext</div>
              <div style={{ color: "#374151", lineHeight: 1.6 }}>
                {extractedData?.shortText || "Hier erscheint optional ein kurzer 2-Satz-Text aus der geladenen Anzeige."}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NumberInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>{label}</label>
      <input
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", boxSizing: "border-box" }}
      />
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
