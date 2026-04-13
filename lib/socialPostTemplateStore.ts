import fs from "fs";
import path from "path";

const filePath = path.join(process.cwd(), "data", "socialPostTemplates.json");

export type SocialPostFormatId = "format-a";

export type SocialPostElementKey =
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

export type SocialPostElementConfig = {
  visible: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  color: string;
  textAlign: "left" | "center" | "right";
  objectFit: "cover" | "contain";
  lineHeight: number;
  iconSize: number;
};

export type SocialPostTemplate = {
  formatId: SocialPostFormatId;
  name: string;
  width: number;
  height: number;
  backgroundImage: string;
  updatedAt: string;
  elements: Record<SocialPostElementKey, SocialPostElementConfig>;
};

function ensureFile() {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(buildDefaultTemplates(), null, 2), "utf-8");
  }
}

function safeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function safeNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeElementConfig(
  element: Partial<SocialPostElementConfig>,
  fallback: SocialPostElementConfig
): SocialPostElementConfig {
  return {
    visible: typeof element.visible === "boolean" ? element.visible : fallback.visible,
    x: safeNumber(element.x, fallback.x),
    y: safeNumber(element.y, fallback.y),
    width: safeNumber(element.width, fallback.width),
    height: safeNumber(element.height, fallback.height),
    fontSize: safeNumber(element.fontSize, fallback.fontSize),
    color: safeString(element.color) || fallback.color,
    textAlign:
      element.textAlign === "center" || element.textAlign === "right" || element.textAlign === "left"
        ? element.textAlign
        : fallback.textAlign,
    objectFit: element.objectFit === "contain" ? "contain" : fallback.objectFit,
    lineHeight: safeNumber(element.lineHeight, fallback.lineHeight),
    iconSize: safeNumber(element.iconSize, fallback.iconSize),
  };
}

function normalizeTemplate(template: Partial<SocialPostTemplate>): SocialPostTemplate {
  const defaults = buildDefaultTemplates()[0];

  return {
    formatId: template.formatId === "format-a" ? template.formatId : defaults.formatId,
    name: safeString(template.name) || defaults.name,
    width: safeNumber(template.width, defaults.width),
    height: safeNumber(template.height, defaults.height),
    backgroundImage: safeString(template.backgroundImage),
    updatedAt: safeString(template.updatedAt) || new Date().toISOString(),
    elements: {
      company: normalizeElementConfig(template.elements?.company || {}, defaults.elements.company),
      jobTitle: normalizeElementConfig(template.elements?.jobTitle || {}, defaults.elements.jobTitle),
      location: normalizeElementConfig(template.elements?.location || {}, defaults.elements.location),
      employment: normalizeElementConfig(template.elements?.employment || {}, defaults.elements.employment),
      highlight: normalizeElementConfig(template.elements?.highlight || {}, defaults.elements.highlight),
      logo: normalizeElementConfig(template.elements?.logo || {}, defaults.elements.logo),
      teaserImage: normalizeElementConfig(template.elements?.teaserImage || {}, defaults.elements.teaserImage),
      branding: normalizeElementConfig(template.elements?.branding || {}, defaults.elements.branding),
      cta: normalizeElementConfig(template.elements?.cta || {}, defaults.elements.cta),
      benefits: normalizeElementConfig(template.elements?.benefits || {}, defaults.elements.benefits),
    },
  };
}

export function getSocialPostTemplates() {
  try {
    ensureFile();
    const file = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(file);
    return Array.isArray(parsed)
      ? parsed.map((item) => normalizeTemplate(item))
      : buildDefaultTemplates();
  } catch {
    return buildDefaultTemplates();
  }
}

function saveSocialPostTemplates(templates: SocialPostTemplate[]) {
  ensureFile();
  fs.writeFileSync(filePath, JSON.stringify(templates, null, 2), "utf-8");
}

export function getSocialPostTemplate(formatId: SocialPostFormatId) {
  const templates = getSocialPostTemplates();
  return templates.find((item) => item.formatId === formatId) || normalizeTemplate({ formatId });
}

export function saveSocialPostTemplate(input: Partial<SocialPostTemplate>) {
  const templates = getSocialPostTemplates();
  const normalized = normalizeTemplate({
    ...input,
    updatedAt: new Date().toISOString(),
  });
  const index = templates.findIndex((item) => item.formatId === normalized.formatId);

  if (index === -1) {
    templates.push(normalized);
  } else {
    templates[index] = normalized;
  }

  saveSocialPostTemplates(templates);
  return normalized;
}

function buildDefaultTemplates(): SocialPostTemplate[] {
  const baseElement: SocialPostElementConfig = {
    visible: true,
    x: 60,
    y: 60,
    width: 320,
    height: 60,
    fontSize: 28,
    color: "#ffffff",
    textAlign: "left",
    objectFit: "cover",
    lineHeight: 1.5,
    iconSize: 18,
  };

  return [
    {
      formatId: "format-a",
      name: "Format A",
      width: 1200,
      height: 1200,
      backgroundImage: "",
      updatedAt: new Date().toISOString(),
      elements: {
        company: { ...baseElement, x: 60, y: 60, width: 500, height: 70, fontSize: 32 },
        jobTitle: { ...baseElement, x: 60, y: 160, width: 700, height: 180, fontSize: 52 },
        location: { ...baseElement, x: 60, y: 370, width: 380, height: 60, fontSize: 28 },
        employment: { ...baseElement, x: 60, y: 450, width: 420, height: 60, fontSize: 24, visible: false },
        highlight: { ...baseElement, x: 60, y: 535, width: 620, height: 120, fontSize: 28, visible: false },
        logo: { ...baseElement, x: 930, y: 60, width: 190, height: 190, objectFit: "contain" },
        teaserImage: { ...baseElement, x: 720, y: 310, width: 400, height: 520, objectFit: "cover" },
        branding: { ...baseElement, x: 60, y: 1010, width: 420, height: 60, fontSize: 28, visible: false },
        cta: { ...baseElement, x: 60, y: 1090, width: 520, height: 56, fontSize: 26, visible: false },
        benefits: {
          ...baseElement,
          x: 60,
          y: 450,
          width: 580,
          height: 220,
          fontSize: 26,
          lineHeight: 1.6,
          iconSize: 24,
        },
      },
    },
  ];
}
