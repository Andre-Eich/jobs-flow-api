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
    const defaults = buildDefaultEntries();

    if (!Array.isArray(parsed)) {
      return defaults;
    }

    const storedEntries = parsed.map((item) => normalizeEntry(item));
    const merged = new Map<string, PromptTextEntry>();

    for (const entry of defaults) {
      merged.set(entry.id, entry);
    }

    for (const entry of storedEntries) {
      merged.set(entry.id, entry);
    }

    return Array.from(merged.values()).sort((a, b) =>
      a.title.localeCompare(b.title, "de", { sensitivity: "base" })
    );
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
      preview: "Informationen zu unseren Anzeigenpreisen ... Mit freundlichen Grüßen",
      content: `Informationen zu unseren Anzeigenpreisen und weitere Details zur regionalen Stellenboerse finden Sie hier: www.jobs-berlin-brandenburg.de

Mit freundlichen Grüßen

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
      id: "coldmail-hint-multiple-jobs",
      area: "kaltakquise",
      title: "Hinweis-Prompt: Mehrere Jobs",
      description: "Zusatzhinweis fuer den Fall, dass mehrere aehnliche Stellen offen sind.",
      preview: "Erwaehne die Moeglichkeit, mehrere Anzeigen gleichzeitig guenstig zu schalten.",
      content: `Wenn mehrere aehnliche Stellen offen sind, erwaehne die Moeglichkeit, mehrere Anzeigen gleichzeitig guenstig zu schalten.`,
      usage: "Wird als zuschaltbarer Hinweis im Kaltakquise-Generator verwendet.",
      placeholders: [],
      status: "aktiv",
      updatedAt: now,
    },
    {
      id: "coldmail-hint-social-media",
      area: "kaltakquise",
      title: "Hinweis-Prompt: Social Media",
      description: "Zusatzhinweis fuer Facebook- und Instagram-Ausspielung.",
      preview: "Hebe hervor, dass Stellenanzeigen zusaetzlich auf Facebook und Instagram ausgespielt werden.",
      content: `Hebe hervor, dass Stellenanzeigen zusaetzlich auf Facebook und Instagram ausgespielt werden und so auch passive Kandidaten erreicht werden.`,
      usage: "Wird als zuschaltbarer Hinweis im Kaltakquise-Generator verwendet.",
      placeholders: [],
      status: "aktiv",
      updatedAt: now,
    },
    {
      id: "coldmail-hint-print",
      area: "kaltakquise",
      title: "Hinweis-Prompt: Print-Anzeige",
      description: "Zusatzhinweis fuer die enthaltene Print-Anzeige bei BB CROSS.",
      preview: "Erwaehne die enthaltene Print-Anzeige bei BB CROSS.",
      content: `Erwaehne die enthaltene Print-Anzeige bei BB CROSS und nenne kurz Vorteile wie regionale Sichtbarkeit und zusaetzliche Reichweite.`,
      usage: "Wird als zuschaltbarer Hinweis im Kaltakquise-Generator verwendet.",
      placeholders: [],
      status: "aktiv",
      updatedAt: now,
    },
    {
      id: "coldmail-hint-multiposting",
      area: "kaltakquise",
      title: "Hinweis-Prompt: Multiposting",
      description: "Zusatzhinweis fuer Multiposting auf weitere Portale.",
      preview: "Erwaehne die Moeglichkeit, Stellenanzeigen zusaetzlich ueber Indeed, MeineStadt und Stepstone zu buchen.",
      content: `Erwaehne die Moeglichkeit, Stellenanzeigen zusaetzlich ueber Indeed, MeineStadt und Stepstone zu buchen.`,
      usage: "Wird als zuschaltbarer Hinweis im Kaltakquise-Generator verwendet.",
      placeholders: [],
      status: "aktiv",
      updatedAt: now,
    },
    {
      id: "coldmail-hook-hybrid",
      area: "kaltakquise",
      title: "Basis-Text: Hybrid",
      description: "Einstiegslogik Hybrid mit drei Mutationen.",
      preview: "Fuer Positionen wie Ihre nutzen viele Unternehmen zusaetzlich unsere Plattform...",
      content: `Variante 1:
- Fuer Positionen wie Ihre nutzen viele Unternehmen zusaetzlich unsere Plattform, um mehr passende Bewerber zu erreichen. Ueber 30.000 Jobsuchende sind monatlich auf unseren regionalen Stellenboersen aktiv.

Variante 2:
- Viele Unternehmen nutzen fuer Positionen wie Ihre zusaetzlich unsere Plattform, um ihre Reichweite zu erhoehen. Monatlich suchen ueber 30.000 Jobsuchende auf unseren regionalen Stellenboersen nach neuen Chancen.

Variante 3:
- Gerade fuer Stellen wie {jobTitle} kann zusaetzliche regionale Reichweite entscheidend sein. Ueber 30.000 Jobsuchende sind monatlich auf unseren regionalen Stellenboersen aktiv.`,
      usage: "Entspricht dem Hook-Block `hybrid` aus app/api/regenerate-email/route.ts.",
      placeholders: ["{jobTitle}"],
      status: "aktiv",
      updatedAt: now,
    },
    {
      id: "coldmail-hook-punch",
      area: "kaltakquise",
      title: "Basis-Text: Punch",
      description: "Direkter Einstiegsblock mit Zahlen und Reichweitenimpuls.",
      preview: "Ueber 30.000 Bewerber suchen monatlich auf unseren regionalen Stellenboersen...",
      content: `Variante 1:
- Ueber 30.000 Bewerber suchen monatlich auf unseren regionalen Stellenboersen nach neuen Positionen - gerade in Berlin und Brandenburg sehen wir hier oft deutlich mehr Ruecklauf.

Variante 2:
- Monatlich nutzen ueber 30.000 Jobsuchende unsere regionalen Stellenboersen. Gerade in Berlin und Brandenburg laesst sich so haeufig zusaetzlicher Ruecklauf erzeugen.

Variante 3:
- Ueber 30.000 Jobsuchende informieren sich monatlich auf unseren regionalen Stellenboersen ueber neue Positionen. Das schafft zusaetzliche Sichtbarkeit genau in Ihrer Region.`,
      usage: "Entspricht dem Hook-Block `punch` aus app/api/regenerate-email/route.ts.",
      placeholders: [],
      status: "aktiv",
      updatedAt: now,
    },
    {
      id: "coldmail-hook-soft-personal",
      area: "kaltakquise",
      title: "Basis-Text: Soft Personal",
      description: "Persoenlicher, weicher Einstieg fuer konkrete Stellen.",
      preview: "Gerade bei Positionen wie {jobTitle} sehen wir haeufig...",
      content: `Variante 1:
- Gerade bei Positionen wie {jobTitle} sehen wir haeufig, dass zusaetzliche regionale Reichweite den Unterschied macht.

Variante 2:
- Bei Stellen wie {jobTitle} kann eine ergaenzende regionale Veroeffentlichung sinnvoll sein, um mehr passende Bewerber zu erreichen.

Variante 3:
- Gerade fuer Positionen wie {jobTitle} lohnt sich oft zusaetzliche Sichtbarkeit in Berlin und Brandenburg.`,
      usage: "Entspricht dem Hook-Block `soft-personal` aus app/api/regenerate-email/route.ts.",
      placeholders: ["{jobTitle}"],
      status: "aktiv",
      updatedAt: now,
    },
    {
      id: "coldmail-hook-problem-focus",
      area: "kaltakquise",
      title: "Basis-Text: Problem-Fokus",
      description: "Einstieg ueber Recruiting-Herausforderung und Engpass.",
      preview: "Viele Unternehmen berichten uns aktuell, dass es zunehmend schwieriger wird...",
      content: `Variante 1:
- Viele Unternehmen berichten uns aktuell, dass es zunehmend schwieriger wird, passende Bewerber fuer Positionen wie {jobTitle} zu erreichen.

Variante 2:
- Gerade bei Stellen wie {jobTitle} bleibt der gewuenschte Ruecklauf oft hinter den Erwartungen zurueck, wenn nur auf wenigen Kanaelen veroeffentlicht wird.

Variante 3:
- Viele Unternehmen stehen derzeit vor der Herausforderung, qualifizierte Bewerber zuverlaessig und regional sichtbar zu erreichen.`,
      usage: "Entspricht dem Hook-Block `problem-focus` aus app/api/regenerate-email/route.ts.",
      placeholders: ["{jobTitle}"],
      status: "aktiv",
      updatedAt: now,
    },
    {
      id: "coldmail-hook-regional",
      area: "kaltakquise",
      title: "Basis-Text: Regional",
      description: "Regionaler Einstieg mit Fokus Berlin-Brandenburg.",
      preview: "Mit unserer regionalen Reichweite in Berlin und Brandenburg lassen sich Stellenanzeigen gezielt dort sichtbar machen...",
      content: `Variante 1:
- Mit unserer regionalen Reichweite in Berlin und Brandenburg lassen sich Stellenanzeigen gezielt dort sichtbar machen, wo passende Bewerber tatsaechlich suchen.

Variante 2:
- Gerade in Berlin und Brandenburg kann zusaetzliche regionale Sichtbarkeit helfen, Ihre Anzeige gezielt vor passende Bewerber zu bringen.

Variante 3:
- Unsere regionalen Stellenboersen werden gezielt von Jobsuchenden aus Berlin und Brandenburg genutzt - genau dort kann Ihre Anzeige zusaetzliche Reichweite gewinnen.`,
      usage: "Entspricht dem Hook-Block `regional` aus app/api/regenerate-email/route.ts.",
      placeholders: [],
      status: "aktiv",
      updatedAt: now,
    },
    {
      id: "coldmail-hook-reach",
      area: "kaltakquise",
      title: "Basis-Text: Reichweite",
      description: "Reichweitenfokus als neutraler Basistext.",
      preview: "Viele Unternehmen erweitern ihre Reichweite gezielt, um mehr passende Bewerber zu erreichen...",
      content: `Variante 1:
- Viele Unternehmen erweitern ihre Reichweite gezielt, um mehr passende Bewerber zu erreichen und offene Stellen schneller sichtbar zu machen.

Variante 2:
- Zusaetzliche Sichtbarkeit kann ein entscheidender Hebel sein, wenn Stellenanzeigen mehr passende Reichweite erhalten sollen.

Variante 3:
- Ergaenzende Reichweite ueber regionale Stellenboersen hilft haeufig dabei, zusaetzliche qualifizierte Bewerber anzusprechen.`,
      usage: "Entspricht dem Hook-Block `reach` aus app/api/regenerate-email/route.ts.",
      placeholders: [],
      status: "aktiv",
      updatedAt: now,
    },
    {
      id: "coldmail-hook-competition",
      area: "kaltakquise",
      title: "Basis-Text: Wettbewerb",
      description: "Einstieg ueber Wettbewerb um Bewerber.",
      preview: "Viele Unternehmen in der Region erhoehen aktuell ihre Sichtbarkeit...",
      content: `Variante 1:
- Viele Unternehmen in der Region erhoehen aktuell ihre Sichtbarkeit, um im Wettbewerb um passende Bewerber besser wahrgenommen zu werden.

Variante 2:
- Im Wettbewerb um qualifizierte Bewerber kann zusaetzliche regionale Praesenz ein klarer Vorteil sein.

Variante 3:
- Gerade in angespannten Bewerbermaerkten ist zusaetzliche Sichtbarkeit oft entscheidend, um schneller passende Rueckmeldungen zu erhalten.`,
      usage: "Entspricht dem Hook-Block `competition` aus app/api/regenerate-email/route.ts.",
      placeholders: [],
      status: "aktiv",
      updatedAt: now,
    },
    {
      id: "coldmail-hook-social-proof",
      area: "kaltakquise",
      title: "Basis-Text: Kundenbeweis",
      description: "Social-Proof-Einstieg ueber andere Unternehmen/Kunden.",
      preview: "Viele unserer Kunden nutzen unsere Plattform ergaenzend...",
      content: `Variante 1:
- Viele unserer Kunden nutzen unsere Plattform ergaenzend, um zusaetzliche Bewerbungen aus der Region zu erhalten.

Variante 2:
- Unternehmen aus Berlin und Brandenburg setzen unsere regionalen Stellenboersen ein, um ihre Reichweite gezielt zu erweitern.

Variante 3:
- Unsere Plattform wird von vielen Unternehmen ergaenzend genutzt, wenn zusaetzliche regionale Sichtbarkeit fuer offene Positionen gefragt ist.`,
      usage: "Entspricht dem Hook-Block `social-proof` aus app/api/regenerate-email/route.ts.",
      placeholders: [],
      status: "aktiv",
      updatedAt: now,
    },
    {
      id: "coldmail-hook-minimal",
      area: "kaltakquise",
      title: "Basis-Text: Minimal",
      description: "Minimaler, sehr kompakter Basiseinstieg.",
      preview: "Wir unterstuetzen Unternehmen dabei, ihre Stellenanzeigen regional sichtbarer zu machen.",
      content: `Variante 1:
- Wir unterstuetzen Unternehmen dabei, ihre Stellenanzeigen regional sichtbarer zu machen.

Variante 2:
- Ueber unsere regionalen Stellenboersen lassen sich offene Positionen gezielt in Berlin und Brandenburg sichtbar machen.

Variante 3:
- Mit zusaetzlicher regionaler Sichtbarkeit lassen sich passende Bewerber oft gezielter erreichen.`,
      usage: "Entspricht dem Hook-Block `minimal` aus app/api/regenerate-email/route.ts.",
      placeholders: [],
      status: "aktiv",
      updatedAt: now,
    },
    {
      id: "coldmail-hook-consultative",
      area: "kaltakquise",
      title: "Basis-Text: Beratend",
      description: "Beratender Basiseinstieg mit weichem Beratungsangebot.",
      preview: "Gern zeige ich Ihnen, wie Ihre Stellenanzeige zusaetzlich regional sichtbar gemacht werden kann.",
      content: `Variante 1:
- Gern zeige ich Ihnen, wie Ihre Stellenanzeige zusaetzlich regional sichtbar gemacht werden kann.

Variante 2:
- Ich moechte Ihnen kurz zeigen, wie sich die Reichweite Ihrer Anzeige in Berlin und Brandenburg sinnvoll ergaenzen laesst.

Variante 3:
- Gern gebe ich Ihnen einen kurzen Ueberblick, wie zusaetzliche regionale Sichtbarkeit fuer Ihre Anzeige aussehen kann.`,
      usage: "Entspricht dem Hook-Block `consultative` aus app/api/regenerate-email/route.ts.",
      placeholders: [],
      status: "aktiv",
      updatedAt: now,
    },
    {
      id: "coldmail-advanced-prompts",
      area: "kaltakquise",
      title: "Erweiterte Prompts & Auswertungen",
      description: "Dokumentiert die Hook-Auswahl, Mutationen und die zugehoerige Auswertungslogik.",
      preview: "10 Basis-Texte, Mutationen, Hook-Auswahl und Oeffnungsraten-Auswertung.",
      content: `Enthaelt:
- 10 Basis-Texte / Hook-Bloecke
- pro Block 3 Mutationen
- Hook-Auswahl "auto" oder gezielt per HookBaseId
- Text-Auswertung ueber Oeffnungen, Reminder-Quote und Bestperformer

Datenquellen:
- Hook-Logik: app/api/regenerate-email/route.ts
- Auswertung: app/api/crm/text-stats/route.ts
- Speicherung: lib/textControllingStore.ts

Ziel:
Die Basis-Texte und ihre Mutationen sollen zentral in Prompts & Texte sichtbar und pflegbar sein.`,
      usage: "Wird als Unterpunkt und Uebersicht fuer die alte Kaltakquise-Logik in Prompts & Texte genutzt.",
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
- Verwende echte deutsche Umlaute: ä, ö, ü
- Wenn eine Grussformel erwähnt oder ausgegeben wird, dann immer "Mit freundlichen Grüßen" mit ß
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
      preview: "Guten Tag {contactPerson}, ... Mit freundlichen Grüßen",
      content: `Anrede:
- Mit Ansprechpartner: Guten Tag {contactPerson},
- Ohne Ansprechpartner: Guten Tag,

Abschluss:
- Genau eine Grussformel am Ende
- Mit freundlichen Grüßen

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
Mit freundlichen Grüßen`,
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
      content: `Mit freundlichen Grüßen

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
