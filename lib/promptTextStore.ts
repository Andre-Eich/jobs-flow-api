import fs from "fs";
import path from "path";

const filePath = path.join(process.cwd(), "data", "promptTextEntries.json");

export type PromptTextArea =
  | "kaltakquise"
  | "streumail"
  | "erinnerungen"
  | "crm"
  | "service-text"
  | "text-generator";

export type PromptTextEntry = {
  id: string;
  area: PromptTextArea;
  title: string;
  description: string;
  preview: string;
  content: string;
  usage: string;
  placeholders: string[];
  status: "aktiv" | "entwurf";
  updatedAt: string;
};

function ensureFile() {
  const dir = path.dirname(filePath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(buildDefaultEntries(), null, 2), "utf-8");
  }
}

function safeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeEntry(entry: Partial<PromptTextEntry>): PromptTextEntry {
  return {
    id: safeString(entry.id) || crypto.randomUUID(),
    area:
      entry.area === "kaltakquise" ||
      entry.area === "streumail" ||
      entry.area === "erinnerungen" ||
      entry.area === "crm" ||
      entry.area === "service-text" ||
      entry.area === "text-generator"
        ? entry.area
        : "crm",
    title: safeString(entry.title),
    description: safeString(entry.description),
    preview: safeString(entry.preview),
    content: safeString(entry.content),
    usage: safeString(entry.usage),
    placeholders: Array.isArray(entry.placeholders)
      ? entry.placeholders.map((item) => safeString(item)).filter(Boolean)
      : [],
    status: entry.status === "entwurf" ? "entwurf" : "aktiv",
    updatedAt: safeString(entry.updatedAt) || new Date().toISOString(),
  };
}

export function getPromptTextEntries() {
  try {
    ensureFile();
    const file = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(file);

    return Array.isArray(parsed)
      ? parsed
          .map((item) => normalizeEntry(item))
          .sort((a, b) => a.title.localeCompare(b.title, "de", { sensitivity: "base" }))
      : buildDefaultEntries();
  } catch {
    return buildDefaultEntries();
  }
}

function savePromptTextEntries(entries: PromptTextEntry[]) {
  ensureFile();
  fs.writeFileSync(filePath, JSON.stringify(entries, null, 2), "utf-8");
}

export function updatePromptTextEntry(
  id: string,
  updates: Partial<Omit<PromptTextEntry, "id" | "updatedAt">>
) {
  const entries = getPromptTextEntries();
  const index = entries.findIndex((item) => item.id === safeString(id));

  if (index === -1) {
    return null;
  }

  entries[index] = normalizeEntry({
    ...entries[index],
    ...updates,
    id: entries[index].id,
    updatedAt: new Date().toISOString(),
  });

  savePromptTextEntries(entries);
  return entries[index];
}

function buildDefaultEntries(): PromptTextEntry[] {
  const now = new Date().toISOString();

  return [
    {
      id: "service-text-default-task",
      area: "service-text",
      title: "Service Text Aufgaben-Template",
      description: "Grundvorlage fuer den Service-Text-Generator mit Wortzahl-Logik.",
      preview: "Erstelle einen natuerlichen deutschen Text mit genau {count} Woertern.",
      content: `Erstelle einen natuerlichen deutschen Text mit genau {count} Woertern.

Vorgaben:
- Das Thema "{theme}" muss klar im Text erkennbar sein.
- Eigenschaften: {properties}
- Der Text soll fluessig und sinnvoll klingen.
- Keine Ueberschrift.
- Keine Erklaerung.
- Gib nur den finalen Text aus.
- Genau {count} Woerter.`,
      usage: "Wird im Bereich Service Text als bearbeitbare Aufgaben-Vorlage verwendet.",
      placeholders: ["{theme}", "{properties}", "{count}"],
      status: "aktiv",
      updatedAt: now,
    },
    {
      id: "coldmail-subject-logic",
      area: "kaltakquise",
      title: "Kaltakquise Betrefflogik",
      description: "Varianten fuer Erstmail- und Follow-up-Betreffzeilen.",
      preview: "Zur Position {jobTitle}: mehr passende Bewerber",
      content: `Erstmail mit Jobtitel:
- Zur Position {jobTitle}: mehr passende Bewerber
- {jobTitle}: zusaetzliche Bewerber erreichen
- Ihre {jobTitle}-Anzeige: mehr Reichweite moeglich
- Kurze Idee zu Ihrer {jobTitle}-Anzeige
- Mehr passende Bewerbungen fuer {jobTitle}

Erstmail ohne Jobtitel:
- Mehr Bewerber fuer Ihre Stellenanzeige
- Zusaetzliche Bewerber fuer Ihre Anzeige
- Ihre Stellenanzeige: mehr Reichweite moeglich
- Kurze Idee zu Ihrer Stellenanzeige
- Mehr passende Bewerbungen fuer Ihre Anzeige

Follow-up mit Jobtitel:
- Erinnerung zu Ihrer {jobTitle}-Anzeige
- Noch einmal zu Ihrer {jobTitle}-Anzeige
- Kurzes Follow-up zur {jobTitle}-Anzeige

Follow-up ohne Jobtitel:
- Kurze Erinnerung zu meiner letzten E-Mail
- Noch einmal zu meiner letzten Nachricht
- Kurzes Follow-up zu meiner letzten E-Mail`,
      usage: "Dokumentiert die aktuelle Betreff-Auswahl in app/api/send-mail/route.ts.",
      placeholders: ["{jobTitle}"],
      status: "aktiv",
      updatedAt: now,
    },
    {
      id: "coldmail-footer-signature",
      area: "kaltakquise",
      title: "Kaltakquise Footer / Signatur",
      description: "Abschlussblock fuer die Einzelmail inklusive Preis-Hinweis und Signatur.",
      preview: "Informationen zu unseren Anzeigenpreisen ... Mit freundlichen Gruessen",
      content: `Informationen zu unseren Anzeigenpreisen und weitere Details zur regionalen Stellenboerse finden Sie hier: www.jobs-berlin-brandenburg.de

Mit freundlichen Gruessen

Andre Eichstaedt
Anzeigenberater
Jobs in Berlin-Brandenburg
Tel. 0335/629797-38
a.eichstaedt@jobs-in-berlin-brandenburg.de
Leipziger Str. 56
15236 Frankfurt (Oder)
www.jobs-in-berlin-brandenburg.de`,
      usage: "Wird in app/api/send-mail/route.ts zum finalen Text und HTML kombiniert.",
      placeholders: [],
      status: "aktiv",
      updatedAt: now,
    },
    {
      id: "bulk-standard-prompt",
      area: "streumail",
      title: "Streumail Standard / Kurzmail Prompt",
      description: "Prompt-Vorlage fuer Bulk-Mails mit Regeln fuer Standard- und Kurzmodus.",
      preview: "Erstelle eine professionelle deutsche Vertriebs-E-Mail fuer ein regionales Stellenportal.",
      content: `Erstelle eine professionelle deutsche Vertriebs-E-Mail fuer ein regionales Stellenportal.

Kontext:
- Unternehmen: {company}
- Ansprechpartner: {contactPerson}
- Branche: {industry}
- Analysehinweis: {analysisSummary}
- Modus: {mode}

Ziel:
Dem Unternehmen soll angeboten werden, offene Positionen zusaetzlich auf jobs-in-berlin-brandenburg.de regional sichtbar zu machen.

WICHTIG:
- Keine Bewerbung
- Kein Betreff
- Keine Signatur
- Keine Anrede am Anfang
- Keine Grussformel am Ende, die kommt spaeter separat
- Kein "Guten Tag", kein "Hallo", keine direkte Begruessung
- Der erste inhaltliche Satz muss mit einem kleingeschriebenen Wort beginnen
- Falls ein Ansprechpartner verwendet wird, dann immer genau ein Vorname und ein Nachname
- Niemals Rollenwoerter oder Funktionsbezeichnungen als Ansprechpartner verwenden, z. B. "Inhaber", "Geschaeftsfuehrer", "Kontaktperson"
- Formuliere weich und unaufdringlich
- Vermeide harte Formulierungen wie "wir platzieren" oder "wir erhoehen"
- Besser: "kann helfen", "laesst sich ergaenzen", "zusaetzliche Sichtbarkeit", "regional sichtbar machen"
- Allgemeiner formulieren als bei einer einzelnen konkret analysierten Stellenanzeige
- Spaeter eingefuegte Zusatzbausteine duerfen nicht vorweggenommen werden

Kurzmodus:
- Haupttext nur 1 bis 2 kurze Saetze

Standardmodus:
- Haupttext 3 bis 5 kurze Saetze
- Vorteile einer gezielten regionalen Stellenboerse klar machen

Antworte nur als JSON:
{
  "body": "...",
  "cta": "..."
}`,
      usage: "Wird aktuell in app/api/generate-bulk-email/route.ts verwendet.",
      placeholders: ["{company}", "{contactPerson}", "{industry}", "{analysisSummary}", "{mode}"],
      status: "aktiv",
      updatedAt: now,
    },
    {
      id: "bulk-subject-logic",
      area: "streumail",
      title: "Streumail Betrefflogik",
      description: "Varianten fuer Standard- und Kurzmodus der Bulk-Mail-Betreffzeilen.",
      preview: "Zusaetzliche regionale Sichtbarkeit fuer offene Positionen",
      content: `Standard:
- Zusaetzliche regionale Sichtbarkeit fuer offene Positionen
- Kurze Idee fuer mehr Reichweite Ihrer Stellenanzeigen
- Mehr regionale Sichtbarkeit fuer Ihre Vakanzen
- Ergaenzende Reichweite fuer offene Positionen in Berlin-Brandenburg

Kurzmodus:
- Kurze Idee zu zusaetzlicher Reichweite
- Ergaenzende Sichtbarkeit fuer offene Positionen
- Kurzer Hinweis zu regionaler Reichweite`,
      usage: "Dokumentiert die aktuelle Betreff-Auswahl in app/api/generate-bulk-email/route.ts.",
      placeholders: [],
      status: "aktiv",
      updatedAt: now,
    },
    {
      id: "bulk-greeting-footer",
      area: "streumail",
      title: "Streumail Anrede / Footer / Signatur",
      description: "Zentrale Begruessungs- und Footer-Logik fuer Bulk-Mails.",
      preview: "Guten Tag {contactPerson}, ... Mit freundlichen Gruessen",
      content: `Anrede:
- Mit Ansprechpartner: Guten Tag {contactPerson},
- Ohne Ansprechpartner: Guten Tag,

Abschluss:
- Genau eine Grussformel am Ende
- Mit freundlichen Gruessen

Signatur / Footer:
- Andre Eichstaedt
- Anzeigenberater
- Jobs in Berlin-Brandenburg
- Tel. 0335/629797-38
- a.eichstaedt@jobs-in-berlin-brandenburg.de
- Leipziger Str. 56
- 15236 Frankfurt (Oder)
- www.jobs-in-berlin-brandenburg.de
- Bild: /andre-eichstaedt.png
- Footer-Bild: /footer-logos.png`,
      usage: "Wird aktuell in app/api/send-bulk-mail/route.ts zusammengesetzt.",
      placeholders: ["{contactPerson}"],
      status: "aktiv",
      updatedAt: now,
    },
    {
      id: "crm-reminder-text",
      area: "crm",
      title: "CRM Erinnerungstext",
      description: "Textlogik fuer Erinnerungen aus dem zentralen CRM, inkl. kurzer und normaler Variante.",
      preview: "ich wollte mich noch einmal kurz melden ...",
      content: `Streumail Erinnerung kurz:
ich wollte mich noch einmal kurz melden, falls zusaetzliche regionale Sichtbarkeit fuer offene Positionen aktuell interessant sein sollte.

Streumail Erinnerung standard:
ich wollte mich noch einmal kurz melden, falls zusaetzliche regionale Sichtbarkeit fuer offene Positionen fuer Sie aktuell interessant sein sollte. Gerade in Berlin und Brandenburg laesst sich damit die bestehende Reichweite oft sinnvoll ergaenzen.

Kaltakquise Erinnerung kurz:
ich wollte mich noch einmal kurz melden, falls das Thema zusaetzliche Reichweite fuer Ihre Anzeige aktuell noch offen ist.

Kaltakquise Erinnerung standard:
ich wollte mich noch einmal kurz nachfassen, falls das Thema zusaetzliche Reichweite fuer Ihre Stellenanzeige aktuell noch offen ist. Unser regionales Umfeld kann dabei oft eine sinnvolle Ergaenzung zu bestehenden Kanaelen sein.

CTA Streumail:
Wenn das fuer Sie interessant ist, sende ich Ihnen gern kurz weitere Infos.

CTA Kaltakquise:
Wenn das fuer Sie interessant ist, melde ich mich gern mit einem kurzen Vorschlag.

Abschluss:
Mit freundlichen Gruessen`,
      usage: "Wird aktuell in app/api/crm/send-reminder/route.ts zusammengebaut.",
      placeholders: [],
      status: "aktiv",
      updatedAt: now,
    },
    {
      id: "crm-reminder-subject",
      area: "crm",
      title: "CRM Reminder Betrefflogik",
      description: "Betreffzeilen fuer Erinnerungen aus dem CRM.",
      preview: "Kurzes Follow-up zu regionaler Sichtbarkeit fuer {company}",
      content: `Streumail:
- Kurzes Follow-up zu regionaler Sichtbarkeit fuer {company}
- Kurzes Follow-up zu regionaler Sichtbarkeit

Kaltakquise:
- Kurzes Follow-up zu {company}
- Kurzes Follow-up zu meiner letzten Nachricht`,
      usage: "Wird aktuell in app/api/crm/send-reminder/route.ts verwendet.",
      placeholders: ["{company}"],
      status: "aktiv",
      updatedAt: now,
    },
    {
      id: "reminder-footer-signature",
      area: "erinnerungen",
      title: "Erinnerungen Footer / Signatur",
      description: "Footer-Baustein fuer Reminder-Mails inklusive Bilder.",
      preview: "Andre Eichstaedt ... /andre-eichstaedt.png /footer-logos.png",
      content: `Mit freundlichen Gruessen

Andre Eichstaedt
Anzeigenberater
Jobs in Berlin-Brandenburg
Tel. 0335/629797-38
a.eichstaedt@jobs-in-berlin-brandenburg.de
Leipziger Str. 56
15236 Frankfurt (Oder)
www.jobs-in-berlin-brandenburg.de

Bilder:
- /andre-eichstaedt.png
- /footer-logos.png`,
      usage: "Wird aktuell fuer CRM-Reminder und Streumails als sauberer Abschluss verwendet.",
      placeholders: [],
      status: "aktiv",
      updatedAt: now,
    },
    {
      id: "text-generator-notes",
      area: "text-generator",
      title: "Text Generator Basisnotiz",
      description: "Platzhalter fuer spaetere zentrale Prompt-Pflege im Text-Generator.",
      preview: "Kommt als naechstes...",
      content: `Dieser Bereich ist als spaetere zentrale Stelle fuer Text-Generator-Prompts vorbereitet.

Geplante Inhalte:
- Generator-Prompts
- Varianten-Logik
- Ausgabeformate
- Vorlagen pro Texttyp`,
      usage: "Dokumentation fuer den spaeteren Ausbau des Text-Generators.",
      placeholders: [],
      status: "entwurf",
      updatedAt: now,
    },
  ];
}
