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
  | "cta"
  | "benefits";

type SocialPostElementConfig = {
  visible: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontPreset: string;
  color: string;
  textAlign: "left" | "center" | "right";
  objectFit: "cover" | "contain";
  lineHeight: number;
  iconSize: number;
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
  benefits: string[];
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

// "list" = Benefit-Häkchenliste im Template
const ELEMENT_LABELS: Array<{ key: SocialPostElementKey; label: string; kind: "text" | "image" | "list" }> = [
  { key: "company", label: "Firmenname", kind: "text" },
  { key: "jobTitle", label: "Jobtitel", kind: "text" },
  { key: "location", label: "Ort", kind: "text" },
  { key: "employment", label: "Arbeitszeit", kind: "text" },
  { key: "highlight", label: "Highlight", kind: "text" },
  { key: "logo", label: "Logo", kind: "image" },
  { key: "teaserImage", label: "Arbeitgeberbild", kind: "image" },
  { key: "branding", label: "Branding", kind: "text" },
  { key: "cta", label: "CTA", kind: "text" },
  { key: "benefits", label: "Benefit-Liste", kind: "list" },
];

// Checkboxen im Content-Tab: nur diese 5 Felder
const CONTENT_ELEMENT_KEYS: SocialPostElementKey[] = [
  "company",
  "jobTitle",
  "logo",
  "teaserImage",
];

const SAMPLE_DATA: ExtractedSocialPostData = {
  company: "IHK Ostbrandenburg",
  jobTitle: "Referent Wirtschaftspolitik (m/w/d)",
  location: "Frankfurt (Oder)",
  employment: "Vollzeit, unbefristet",
  highlight: "Hoher Gestaltungsspielraum",
  logoUrl: "",
  teaserImageUrl: "",
  link: "https://jobs-in-berlin-brandenburg.de/",
  shortText: "Referent Wirtschaftspolitik (m/w/d) bei IHK Ostbrandenburg.",
  captionText:
    "Die IHK Ostbrandenburg sucht einen Referenten Wirtschaftspolitik (m/w/d) in Frankfurt (Oder) – eine Stelle mit echtem Gestaltungsspielraum. Jetzt bewerben und Teil der regionalen Wirtschaftsförderung werden.",
  benefits: ["Vollzeit, unbefristet", "Tarifliche Vergütung", "Hoher Gestaltungsspielraum"],
};

const FONT_PRESETS = [
  { id: "arial", label: "Arial", family: "Arial, sans-serif", weight: 500 },
  { id: "georgia", label: "Georgia", family: "Georgia, serif", weight: 500 },
  { id: "trebuchet", label: "Trebuchet", family: "'Trebuchet MS', sans-serif", weight: 500 },
  { id: "arial-black", label: "Arial Black (Heavy)", family: "'Arial Black', Gadget, sans-serif", weight: 700 },
  { id: "impact", label: "Impact (Heavy)", family: "Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif", weight: 700 },
  { id: "verdana-bold", label: "Verdana (Bold)", family: "Verdana, Geneva, sans-serif", weight: 700 },
] as const;

function getFontPreset(id: string) {
  return FONT_PRESETS.find((preset) => preset.id === id) || FONT_PRESETS[0];
}

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

function getProxiedImageUrl(src: string) {
  if (!src || src.startsWith("data:") || src.startsWith("blob:")) {
    return src;
  }

  if (src.startsWith("/")) {
    return src;
  }

  return `/api/social-posts/image-proxy?url=${encodeURIComponent(src)}`;
}

async function loadExportImage(src: string) {
  const finalSrc = getProxiedImageUrl(src);
  if (!finalSrc) return null;

  return await new Promise<HTMLImageElement | null>((resolve) => {
    const image = new window.Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = finalSrc;
  });
}

function drawWrappedText(args: {
  ctx: CanvasRenderingContext2D;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontPreset: string;
  color: string;
  textAlign: "left" | "center" | "right";
  fontWeight?: number;
  lineHeight?: number;
}) {
  const { ctx, text, x, y, width, height, fontSize, fontPreset, color, textAlign, fontWeight, lineHeight = 1.15 } =
    args;
  if (!text) return;
  const preset = getFontPreset(fontPreset);
  const effectiveWeight = fontWeight ?? preset.weight;

  ctx.save();
  ctx.font = `${effectiveWeight} ${fontSize}px ${preset.family}`;
  ctx.fillStyle = color;
  ctx.textAlign = textAlign;
  ctx.textBaseline = "top";

  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width <= width || !current) {
      current = next;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);

  const lineHeightPx = fontSize * lineHeight;
  const maxLines = Math.max(1, Math.floor(height / lineHeightPx));
  const visibleLines = lines.slice(0, maxLines);
  if (lines.length > maxLines && visibleLines.length > 0) {
    let lastLine = visibleLines[visibleLines.length - 1];
    while (lastLine.length > 1 && ctx.measureText(`${lastLine}…`).width > width) {
      lastLine = lastLine.slice(0, -1).trimEnd();
    }
    visibleLines[visibleLines.length - 1] = `${lastLine}…`;
  }

  const textX = textAlign === "center" ? x + width / 2 : textAlign === "right" ? x + width : x;
  visibleLines.forEach((line, index) => {
    ctx.fillText(line, textX, y + index * lineHeightPx);
  });
  ctx.restore();
}

function drawBenefitList(args: {
  ctx: CanvasRenderingContext2D;
  items: string[];
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontPreset: string;
  color: string;
  lineHeight: number;
  iconSize: number;
}) {
  const { ctx, items, x, y, width, height, fontSize, fontPreset, color, lineHeight, iconSize } = args;
  if (items.length === 0) return;
  const preset = getFontPreset(fontPreset);

  const rowHeight = fontSize * lineHeight;
  const maxRows = Math.max(1, Math.floor(height / rowHeight));
  const visibleItems = items.slice(0, maxRows);

  ctx.save();
  ctx.fillStyle = color;
  ctx.textBaseline = "top";

  visibleItems.forEach((item, index) => {
    const rowY = y + index * rowHeight;
    ctx.font = `700 ${iconSize}px ${preset.family}`;
    ctx.fillText("✓", x, rowY);
    drawWrappedText({
      ctx,
      text: item,
      x: x + iconSize + 10,
      y: rowY,
      width: width - iconSize - 10,
      height: rowHeight,
      fontSize,
      fontPreset,
      color,
      textAlign: "left",
      fontWeight: preset.weight,
      lineHeight: 1.2,
    });
  });

  ctx.restore();
}

function drawImageWithFit(args: {
  ctx: CanvasRenderingContext2D;
  image: HTMLImageElement;
  x: number;
  y: number;
  width: number;
  height: number;
  objectFit: "cover" | "contain";
}) {
  const { ctx, image, x, y, width, height, objectFit } = args;
  const imageRatio = image.width / image.height;
  const boxRatio = width / height;

  let drawWidth = width;
  let drawHeight = height;
  let drawX = x;
  let drawY = y;

  if (objectFit === "cover") {
    if (imageRatio > boxRatio) {
      drawHeight = height;
      drawWidth = height * imageRatio;
      drawX = x - (drawWidth - width) / 2;
    } else {
      drawWidth = width;
      drawHeight = width / imageRatio;
      drawY = y - (drawHeight - height) / 2;
    }
  } else {
    if (imageRatio > boxRatio) {
      drawWidth = width;
      drawHeight = width / imageRatio;
      drawY = y + (height - drawHeight) / 2;
    } else {
      drawHeight = height;
      drawWidth = height * imageRatio;
      drawX = x + (width - drawWidth) / 2;
    }
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, width, height);
  ctx.clip();
  ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
  ctx.restore();
}

// Benefit-Liste als Häkchen-Zeilen rendern
function BenefitList({
  items,
  color,
  fontSize,
  fontPreset,
  lineHeight,
  iconSize,
  scale,
}: {
  items: string[];
  color: string;
  fontSize: number;
  fontPreset: string;
  lineHeight: number;
  iconSize: number;
  scale: number;
}) {
  if (items.length === 0) return null;
  const preset = getFontPreset(fontPreset);
  const rowGap = (lineHeight - 1) * fontSize * scale * 1.4;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: rowGap }}>
      {items.map((item, idx) => (
        <div
          key={idx}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 6 * scale,
          }}
        >
          <span
            style={{
              fontSize: iconSize * scale,
              fontFamily: preset.family,
              color,
              flexShrink: 0,
              lineHeight: 1.1,
              fontWeight: 700,
            }}
          >
            ✓
          </span>
          <span
            style={{
              fontSize: fontSize * scale,
              fontFamily: preset.family,
              color,
              lineHeight: 1.2,
              fontWeight: preset.weight,
            }}
          >
            {item}
          </span>
        </div>
      ))}
    </div>
  );
}

// Statische Vorschau – Content-Tab (nicht interaktiv)
function SocialPostPreview({
  template,
  data,
  selectedElements,
  targetWidth = 760,
}: {
  template: SocialPostTemplate;
  data: ExtractedSocialPostData;
  selectedElements?: Partial<Record<SocialPostElementKey, boolean>>;
  targetWidth?: number;
}) {
  const scale = targetWidth / template.width;

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
            background: "linear-gradient(145deg, rgba(15, 23, 42, 0.28), rgba(37, 99, 235, 0.16))",
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

        if (element.kind === "list") {
          const items = data.benefits ?? [];
          if (items.length === 0) return null;
          return (
            <div
              key={element.key}
              style={{ position: "absolute", left, top, width, height, overflow: "hidden" }}
            >
              <BenefitList
                items={items}
                color={config.color}
                fontSize={config.fontSize}
                fontPreset={config.fontPreset}
                lineHeight={config.lineHeight ?? 1.6}
                iconSize={config.iconSize ?? 18}
                scale={scale}
              />
            </div>
          );
        }

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
              fontFamily: getFontPreset(config.fontPreset).family,
              textAlign: config.textAlign,
              lineHeight: 1.15,
              fontWeight: element.key === "jobTitle" ? 700 : getFontPreset(config.fontPreset).weight,
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

// Interaktiver Canvas – Template-Tab
function SocialPostTemplateCanvas({
  template,
  data,
  activeElement,
  onSelectElement,
  onUpdateElement,
  targetWidth = 760,
}: {
  template: SocialPostTemplate;
  data: ExtractedSocialPostData;
  activeElement: SocialPostElementKey;
  onSelectElement: (key: SocialPostElementKey) => void;
  onUpdateElement: (key: SocialPostElementKey, patch: Partial<SocialPostElementConfig>) => void;
  targetWidth?: number;
}) {
  const scale = targetWidth / template.width;
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
            background: "linear-gradient(145deg, rgba(15, 23, 42, 0.28), rgba(37, 99, 235, 0.16))",
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
                : element.kind === "image"
                ? "1px solid rgba(107,114,128,0.9)"
                : "1px solid rgba(255,255,255,0.10)",
              outlineOffset: isActive ? "1px" : "0px",
              borderRadius: element.kind === "image" ? "14px" : "4px",
              overflow: "hidden",
              boxSizing: "border-box",
              ...(element.kind === "image"
                ? {
                    background: isActive ? "rgba(191,219,254,0.28)" : "rgba(148,163,184,0.22)",
                    backdropFilter: "blur(4px)",
                    boxShadow: isActive ? "0 0 0 1px rgba(59,130,246,0.25) inset" : "0 0 0 1px rgba(107,114,128,0.22) inset",
                  }
                : {}),
            }}
          >
            {element.kind === "list" ? (
              <div style={{ padding: "2px", pointerEvents: "none" }}>
                <BenefitList
                  items={data.benefits?.length ? data.benefits : SAMPLE_DATA.benefits}
                  color={config.color}
                  fontSize={config.fontSize}
                  fontPreset={config.fontPreset}
                  lineHeight={config.lineHeight ?? 1.6}
                  iconSize={config.iconSize ?? 18}
                  scale={scale}
                />
              </div>
            ) : element.kind === "image" ? (
              (() => {
                const src = buildImageSource(element.key, data);
                return src ? (
                  <Image
                    src={src}
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
                      color: "#374151",
                      fontSize: Math.max(10, 12 * scale),
                      textAlign: "center",
                      padding: "6px",
                      boxSizing: "border-box",
                      pointerEvents: "none",
                      opacity: 0.95,
                      background: "rgba(255,255,255,0.38)",
                    }}
                  >
                    {element.label}
                  </div>
                );
              })()
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  color: config.color,
                  fontSize: config.fontSize * scale,
                  fontFamily: getFontPreset(config.fontPreset).family,
                  textAlign: config.textAlign,
                  lineHeight: 1.15,
                  fontWeight: element.key === "jobTitle" ? 700 : getFontPreset(config.fontPreset).weight,
                  whiteSpace: "pre-wrap",
                  overflow: "hidden",
                  textShadow: "0 2px 10px rgba(15, 23, 42, 0.45)",
                  pointerEvents: "none",
                  padding: "2px",
                  boxSizing: "border-box",
                }}
              >
                {buildElementText(element.key, data)}
              </div>
            )}

            {/* Resize-Handle */}
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
                  <path d="M7 1L1 7M7 4L4 7" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
            )}

            {/* Aktives Element: Label */}
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

  // Nur die 5 sinnvollen Felder haben Checkboxen im Content-Tab
  const [selectedElements, setSelectedElements] = useState<Partial<Record<SocialPostElementKey, boolean>>>({
    company: true,
    jobTitle: true,
    logo: true,
    teaserImage: true,
  });

  const [extractedData, setExtractedData] = useState<ExtractedSocialPostData | null>(null);
  const [selectedBenefits, setSelectedBenefits] = useState<string[]>([]);
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

  const activeElementKind = useMemo(
    () => ELEMENT_LABELS.find((el) => el.key === activeElement)?.kind ?? "text",
    [activeElement]
  );

  async function handleBackgroundUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !templateDraft) return;
    const reader = new FileReader();
    reader.onload = () => {
      setTemplateDraft((prev) =>
        prev ? { ...prev, backgroundImage: String(reader.result || "") } : prev
      );
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
              [key]: { ...prev.elements[key], ...patch },
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
      setSuccessMessage("Template gespeichert.");
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
      // Automatisch die ersten 3 Benefits vorauswählen
      const initialBenefits: string[] = Array.isArray(data.data.benefits)
        ? data.data.benefits.slice(0, 4)
        : [];
      setSelectedBenefits(initialBenefits);
      setSuccessMessage("Stellenanzeige geladen.");
    } catch {
      setError("Die Stellenanzeige konnte nicht ausgewertet werden.");
    } finally {
      setLoadingContent(false);
    }
  }

  function toggleBenefit(benefit: string) {
    setSelectedBenefits((prev) =>
      prev.includes(benefit) ? prev.filter((b) => b !== benefit) : [...prev, benefit]
    );
  }

  // Daten für die Content-Vorschau: merged mit ausgewählten Benefits
  const previewData: ExtractedSocialPostData = extractedData
    ? { ...extractedData, benefits: selectedBenefits }
    : SAMPLE_DATA;

  // selectedElements + benefits-Flag für Vorschau
  const effectiveSelectedElements: Partial<Record<SocialPostElementKey, boolean>> = {
    ...selectedElements,
    benefits: selectedBenefits.length > 0,
  };

  async function handleSaveRenderedImage() {
    if (!template || !extractedData) {
      setError("Bitte zuerst eine Stellenanzeige laden.");
      return;
    }

    try {
      setError("");
      setSuccessMessage("");

      const canvas = document.createElement("canvas");
      canvas.width = template.width;
      canvas.height = template.height;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        setError("Das finale Bild konnte nicht gerendert werden.");
        return;
      }

      if (template.backgroundImage) {
        const background = await loadExportImage(template.backgroundImage);
        if (background) {
          drawImageWithFit({
            ctx,
            image: background,
            x: 0,
            y: 0,
            width: template.width,
            height: template.height,
            objectFit: "cover",
          });
        }
      } else {
        const gradient = ctx.createLinearGradient(0, 0, template.width, template.height);
        gradient.addColorStop(0, "#0f172a");
        gradient.addColorStop(1, "#334155");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, template.width, template.height);
      }

      for (const element of ELEMENT_LABELS) {
        const config = template.elements[element.key];
        if (!config.visible || !effectiveSelectedElements[element.key]) continue;

        if (element.kind === "image") {
          const src = buildImageSource(element.key, previewData);
          const image = await loadExportImage(src);
          if (!image) continue;
          drawImageWithFit({
            ctx,
            image,
            x: config.x,
            y: config.y,
            width: config.width,
            height: config.height,
            objectFit: config.objectFit,
          });
          continue;
        }

        if (element.kind === "list") {
          drawBenefitList({
            ctx,
            items: previewData.benefits,
            x: config.x,
            y: config.y,
            width: config.width,
            height: config.height,
            fontSize: config.fontSize,
            fontPreset: config.fontPreset,
            color: config.color,
            lineHeight: config.lineHeight ?? 1.6,
            iconSize: config.iconSize ?? 18,
          });
          continue;
        }

        drawWrappedText({
          ctx,
          text: buildElementText(element.key, previewData),
          x: config.x,
          y: config.y,
          width: config.width,
          height: config.height,
          fontSize: config.fontSize,
          fontPreset: config.fontPreset,
          color: config.color,
          textAlign: config.textAlign,
          fontWeight: element.key === "jobTitle" ? 700 : 500,
        });
      }

      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `${(previewData.company || "social-post").replace(/[^\w-]+/g, "-").toLowerCase()}-${(previewData.jobTitle || "job").replace(/[^\w-]+/g, "-").toLowerCase()}.png`;
      link.click();

      setSuccessMessage("Das finale gerenderte Bild wurde als PNG exportiert.");
    } catch {
      setError("Das finale Bild konnte nicht gespeichert werden.");
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
      <div>
        <h1 style={{ margin: 0, fontSize: "22px" }}>Social Posts</h1>
        <div style={{ marginTop: "8px", color: "#6b7280", fontSize: "14px", maxWidth: "860px" }}>
          Dauerhaft gespeichertes Bild-Template + Social Content aus Stellenanzeigen-URLs.
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

      {/* ───────────── TEMPLATE BEARBEITEN ───────────── */}
      {activeTab === "template" ? (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(320px, 1fr) minmax(560px, 2fr)", gap: "18px", alignItems: "start" }}>
          <div style={{ ...panelStyle(), minWidth: 0 }}>
            <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "16px" }}>Einstellungen</div>

            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}>Format</label>
              <select
                value={formatId}
                onChange={(e) => setFormatId(e.target.value === "format-a" ? "format-a" : "format-a")}
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", background: "#fff" }}
              >
                <option value="format-a">Format A (1200 × 1200)</option>
              </select>
            </div>

            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}>Hintergrundbild</label>
              <input type="file" accept="image/*" onChange={handleBackgroundUpload} />
              <div style={{ marginTop: "6px", fontSize: "12px", color: "#6b7280" }}>
                Wird mit Positionen dauerhaft gespeichert.
              </div>
            </div>

            <div style={{ marginBottom: "14px" }}>
              <div style={{ fontWeight: 600, marginBottom: "8px" }}>Element wählen</div>
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
                      background: activeElement === element.key ? "#eff6ff" : "#fff",
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
                    onChange={(e) => updateElementConfig(activeElement, { visible: e.target.checked })}
                  />
                  Sichtbar
                </label>

                {/* Benefit-Liste: eigene Optionen */}
                {activeElementKind === "list" && (
                  <>
                    <div>
                      <label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>Schriftart</label>
                      <select
                        value={activeElementConfig.fontPreset}
                        onChange={(e) => updateElementConfig(activeElement, { fontPreset: e.target.value })}
                        style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", background: "#fff" }}
                      >
                        {FONT_PRESETS.map((preset) => (
                          <option key={preset.id} value={preset.id}>
                            {preset.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <NumberField
                      label="Schriftgröße"
                      value={activeElementConfig.fontSize}
                      onChange={(v) => updateElementConfig(activeElement, { fontSize: v })}
                    />
                    <div>
                      <label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>Farbe</label>
                      <input
                        type="color"
                        value={activeElementConfig.color}
                        onChange={(e) => updateElementConfig(activeElement, { color: e.target.value })}
                        style={{ width: "100%", height: "40px", border: "1px solid #cbd5e1", borderRadius: "8px" }}
                      />
                    </div>
                    <NumberField
                      label="Zeilenabstand (z.B. 1.6)"
                      value={activeElementConfig.lineHeight ?? 1.6}
                      onChange={(v) => updateElementConfig(activeElement, { lineHeight: v })}
                      step={0.1}
                    />
                    <NumberField
                      label="Häkchen-Größe"
                      value={activeElementConfig.iconSize ?? 18}
                      onChange={(v) => updateElementConfig(activeElement, { iconSize: v })}
                    />
                  </>
                )}

                {/* Text-Elemente */}
                {activeElementKind === "text" && (
                  <>
                    <div>
                      <label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>Schriftart</label>
                      <select
                        value={activeElementConfig.fontPreset}
                        onChange={(e) => updateElementConfig(activeElement, { fontPreset: e.target.value })}
                        style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", background: "#fff" }}
                      >
                        {FONT_PRESETS.map((preset) => (
                          <option key={preset.id} value={preset.id}>
                            {preset.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <NumberField
                      label="Schriftgröße"
                      value={activeElementConfig.fontSize}
                      onChange={(v) => updateElementConfig(activeElement, { fontSize: v })}
                    />
                    <div>
                      <label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>Farbe</label>
                      <input
                        type="color"
                        value={activeElementConfig.color}
                        onChange={(e) => updateElementConfig(activeElement, { color: e.target.value })}
                        style={{ width: "100%", height: "40px", border: "1px solid #cbd5e1", borderRadius: "8px" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>Ausrichtung</label>
                      <select
                        value={activeElementConfig.textAlign}
                        onChange={(e) =>
                          updateElementConfig(activeElement, {
                            textAlign:
                              e.target.value === "center" || e.target.value === "right"
                                ? e.target.value
                                : "left",
                          })
                        }
                        style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", background: "#fff" }}
                      >
                        <option value="left">Links</option>
                        <option value="center">Zentriert</option>
                        <option value="right">Rechts</option>
                      </select>
                    </div>
                  </>
                )}

                {/* Bild-Elemente */}
                {activeElementKind === "image" && (
                  <div>
                    <label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>Bildmodus</label>
                    <select
                      value={activeElementConfig.objectFit}
                      onChange={(e) =>
                        updateElementConfig(activeElement, {
                          objectFit: e.target.value === "contain" ? "contain" : "cover",
                        })
                      }
                      style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", background: "#fff" }}
                    >
                      <option value="cover">Cover (füllt Bereich)</option>
                      <option value="contain">Contain (zeigt Ganzes)</option>
                    </select>
                  </div>
                )}

                <div style={{ fontSize: "12px", color: "#9ca3af", lineHeight: 1.6 }}>
                  x: {activeElementConfig.x} · y: {activeElementConfig.y} ·{" "}
                  {activeElementConfig.width} × {activeElementConfig.height} px
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
                  color: "#fff",
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
                  style={{ padding: "10px 14px", border: "1px solid #cbd5e1", borderRadius: "8px", background: "#fff", cursor: "pointer" }}
                >
                  Stand laden
                </button>
              ) : null}
            </div>
          </div>

          {/* Canvas */}
          <div style={{ ...panelStyle(), minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", marginBottom: "12px", flexWrap: "wrap", alignItems: "flex-end" }}>
              <div>
                <div style={{ fontSize: "18px", fontWeight: 700 }}>Canvas</div>
                <div style={{ marginTop: "4px", color: "#6b7280", fontSize: "13px" }}>
                  Drag zum Verschieben · Blauer Handle zum Vergrößern/Verkleinern
                </div>
              </div>
              <div style={{ fontSize: "12px", color: "#6b7280" }}>
                {templateDraft ? `Gespeichert: ${formatDate(templateDraft.updatedAt)}` : ""}
              </div>
            </div>

            {loadingTemplate || !templateDraft ? (
              <div style={{ color: "#6b7280" }}>Template wird geladen...</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <SocialPostTemplateCanvas
                  template={templateDraft}
                  data={SAMPLE_DATA}
                  activeElement={activeElement}
                  onSelectElement={setActiveElement}
                  onUpdateElement={updateElementConfig}
                  targetWidth={760}
                />
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ───────────── CONTENT ERSTELLEN ───────────── */
        <div style={{ display: "grid", gridTemplateColumns: "minmax(320px, 1fr) minmax(560px, 2fr)", gap: "18px" }}>
          {/* Linkes Panel */}
          <div style={panelStyle()}>
            <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "16px" }}>Content erstellen</div>

            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}>URL der Stellenanzeige</label>
              <input
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", boxSizing: "border-box" }}
              />
            </div>

            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}>Format</label>
              <select
                value={formatId}
                onChange={(e) => setFormatId(e.target.value === "format-a" ? "format-a" : "format-a")}
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", background: "#fff" }}
              >
                <option value="format-a">Format A (1200 × 1200)</option>
              </select>
            </div>

            {/* Vereinfachte Checkboxen: nur 5 Basisfelder */}
            <div style={{ marginBottom: "14px" }}>
              <div style={{ fontWeight: 600, marginBottom: "8px" }}>Felder übernehmen</div>
              <div style={{ display: "grid", gap: "8px" }}>
                {CONTENT_ELEMENT_KEYS.map((key) => {
                  const label = ELEMENT_LABELS.find((el) => el.key === key)?.label ?? key;
                  return (
                    <label key={key} style={{ fontSize: "14px" }}>
                      <input
                        type="checkbox"
                        checked={selectedElements[key] ?? false}
                        onChange={(e) =>
                          setSelectedElements((prev) => ({ ...prev, [key]: e.target.checked }))
                        }
                        style={{ marginRight: "6px" }}
                      />
                      {label}
                    </label>
                  );
                })}
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
                color: "#fff",
                cursor: loadingContent ? "not-allowed" : "pointer",
                opacity: loadingContent ? 0.7 : 1,
              }}
            >
              {loadingContent ? "Analysiert..." : "URL laden und Content vorbereiten"}
            </button>

            {/* Benefit-Badges */}
            {extractedData && extractedData.benefits.length > 0 && (
              <div style={{ marginTop: "18px", borderTop: "1px solid #e5e7eb", paddingTop: "16px" }}>
                <div style={{ fontWeight: 600, marginBottom: "6px" }}>Benefits für das Bild</div>
                <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "10px" }}>
                  Klick zum Aus-/Abwählen – ausgewählte erscheinen als ✓-Liste im Template.
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {extractedData.benefits.map((benefit) => {
                    const active = selectedBenefits.includes(benefit);
                    return (
                      <button
                        key={benefit}
                        type="button"
                        onClick={() => toggleBenefit(benefit)}
                        style={{
                          padding: "6px 12px",
                          borderRadius: "999px",
                          border: `1px solid ${active ? "#111827" : "#cbd5e1"}`,
                          background: active ? "#111827" : "#f9fafb",
                          color: active ? "#ffffff" : "#374151",
                          cursor: "pointer",
                          fontSize: "13px",
                          fontWeight: active ? 700 : 400,
                          transition: "background 0.1s",
                        }}
                      >
                        {active ? "✓ " : ""}{benefit}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Extrahierte Daten */}
            {extractedData ? (
              <div style={{ marginTop: "18px", borderTop: "1px solid #e5e7eb", paddingTop: "16px", display: "grid", gap: "8px", fontSize: "13px" }}>
                <PreviewRow label="Firmenname" value={extractedData.company || "-"} />
                <PreviewRow label="Jobtitel" value={extractedData.jobTitle || "-"} />
                <PreviewRow label="Ort" value={extractedData.location || "-"} />
                <PreviewRow label="Logo" value={extractedData.logoUrl || "-"} />
                <PreviewRow label="Hauptbild" value={extractedData.teaserImageUrl || "-"} />
                <PreviewRow label="Link" value={extractedData.link || "-"} />
              </div>
            ) : null}
          </div>

          {/* Rechtes Panel */}
          <div style={{ display: "grid", gap: "18px" }}>
            <div style={panelStyle()}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", marginBottom: "16px", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: "18px", fontWeight: 700 }}>Bild-Vorschau</div>
                  <div style={{ marginTop: "6px", color: "#6b7280", fontSize: "13px" }}>
                    Gespeichertes Template + ausgewählte Elemente und Benefits.
                  </div>
                </div>
                <div style={{ fontSize: "12px", color: "#6b7280" }}>
                  {template ? `Template: ${formatDate(template.updatedAt)}` : ""}
                </div>
              </div>

              {template && extractedData ? (
                <>
                  <div style={{ overflowX: "auto" }}>
                    <SocialPostPreview
                      template={template}
                      data={previewData}
                      selectedElements={effectiveSelectedElements}
                      targetWidth={760}
                    />
                  </div>
                  <div style={{ marginTop: "14px" }}>
                    <button
                      type="button"
                      onClick={handleSaveRenderedImage}
                      style={{
                        padding: "10px 18px",
                        border: "none",
                        borderRadius: "8px",
                        background: "#111827",
                        color: "#fff",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: 600,
                      }}
                    >
                      Finales Bild speichern
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

function NumberField({
  label,
  value,
  onChange,
  step,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <div>
      <label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>{label}</label>
      <input
        type="number"
        value={value}
        step={step ?? 1}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "8px", boxSizing: "border-box" }}
      />
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
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "10px",
          gap: "12px",
        }}
      >
        <div style={{ fontSize: "18px", fontWeight: 700 }}>Post-Text</div>
        <button
          type="button"
          onClick={handleCopy}
          disabled={!captionText}
          style={{
            padding: "8px 14px",
            border: "1px solid #cbd5e1",
            borderRadius: "8px",
            background: copied ? "#f0fdf4" : "#fff",
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
        {captionText ||
          "Hier erscheint der generierte Post-Text nach dem Laden einer Stellenanzeige."}
      </div>
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "130px 1fr", gap: "10px" }}>
      <div style={{ color: "#6b7280" }}>{label}</div>
      <div style={{ wordBreak: "break-word" }}>{value}</div>
    </div>
  );
}

