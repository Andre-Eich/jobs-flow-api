import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const allowProtected = process.env.ALLOW_PROTECTED_CHANGES === "1";

const redFiles = [
  "lib/leadStore.ts",
  "lib/bulkPackageStore.ts",
  "lib/textControllingStore.ts",
  "lib/reminderStore.ts",
  "app/api/send-mail/route.ts",
  "app/api/send-bulk-mail/route.ts",
  "app/api/crm/leads/route.ts",
  "app/api/crm/emails/route.ts",
  "app/api/crm/bulk-packages/route.ts",
  "app/api/crm/send-reminder/route.ts",
];

const yellowFiles = [
  "app/photo/page.replacement.tsx",
  "app/photo/page.replacement.v4.tsx",
  "app/photo/BulkLeadsTable.replacement.v4.tsx",
  "app/crm/page.tsx",
  "app/prompts-text/page.tsx",
  "lib/promptTextStore.ts",
  "app/api/bulk-find-leads/route.ts",
  "app/api/bulk-collect-contact/route.ts",
  "app/api/generate-bulk-email/route.ts",
];

const activeUiCoreFiles = [
  "app/photo/page.replacement.tsx",
  "app/photo/page.replacement.v4.tsx",
  "app/photo/BulkLeadsTable.replacement.v4.tsx",
  "app/crm/page.tsx",
];

const errors = [];
const warnings = [];

function normalizePath(path) {
  return path.replaceAll("\\", "/").trim();
}

function getChangedEntries() {
  const output = execFileSync("git", ["status", "--short"], { encoding: "utf8" });
  return output
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => {
      const status = line.slice(0, 2);
      const rawPath = line.slice(3).trim();
      const finalPath = rawPath.includes(" -> ") ? rawPath.split(" -> ").pop() : rawPath;
      return { status, file: normalizePath(finalPath || rawPath) };
    })
    .filter((entry) => entry.file);
}

function checkDataFiles(changedFiles) {
  const dataFiles = changedFiles.filter((file) => /^data\/.*\.json$/i.test(file));
  if (dataFiles.length) {
    errors.push(
      [
        "Laufzeit-/Protokolldaten sind geaendert. Nicht stagen, nicht committen, Rueckfrage halten:",
        ...dataFiles.map((file) => `- ${file}`),
      ].join("\n")
    );
  }
}

function checkEntryImports() {
  const bulkEntry = "app/services/bulk-mail-entry.tsx";
  const coldEntry = "app/services/cold-mail-entry.tsx";

  if (!existsSync(bulkEntry) || !readFileSync(bulkEntry, "utf8").includes("../photo/page.replacement.v4")) {
    errors.push(`${bulkEntry} importiert nicht mehr den aktiven Streumail-Pfad ../photo/page.replacement.v4.`);
  }

  if (!existsSync(coldEntry) || !readFileSync(coldEntry, "utf8").includes("../photo/page.replacement")) {
    errors.push(`${coldEntry} importiert nicht mehr den aktiven Kaltakquise-Pfad ../photo/page.replacement.`);
  }
}

function checkRedFiles(changedFiles) {
  const changedRed = redFiles.filter((file) => changedFiles.includes(file));
  if (!changedRed.length) return;

  const message = [
    "Rote geschuetzte Dateien sind geaendert:",
    ...changedRed.map((file) => `- ${file}`),
    "Bewusste Aenderung nur mit ALLOW_PROTECTED_CHANGES=1.",
  ].join("\n");

  if (allowProtected) {
    warnings.push(`${message}\nALLOW_PROTECTED_CHANGES=1 ist gesetzt, daher blockiert diese Warnung nicht.`);
  } else {
    errors.push(message);
  }
}

function checkYellowFiles(changedFiles) {
  const changedYellow = yellowFiles.filter((file) => changedFiles.includes(file));
  if (changedYellow.length) {
    warnings.push(
      [
        "Gelbe Schutzdateien sind geaendert. Bitte pruefen, ob die Aenderung gezielt/additiv war:",
        ...changedYellow.map((file) => `- ${file}`),
      ].join("\n")
    );
  }
}

function checkActiveUiMultipleChanges(changedFiles) {
  const changedCore = activeUiCoreFiles.filter((file) => changedFiles.includes(file));
  if (changedCore.length < 2) return;

  const message = [
    "Mehrere aktive UI-Kerndateien sind gleichzeitig geaendert:",
    ...changedCore.map((file) => `- ${file}`),
    "Das ist historisch riskant fuer Kaltmail-/Streumail-/CRM-Bereiche.",
  ].join("\n");

  if (allowProtected) {
    warnings.push(`${message}\nALLOW_PROTECTED_CHANGES=1 ist gesetzt, daher blockiert diese Warnung nicht.`);
  } else {
    errors.push(`${message}\nBewusste Mehrfachaenderung nur mit ALLOW_PROTECTED_CHANGES=1.`);
  }
}

function checkHistoricalFiles(changedEntries) {
  const changedFiles = changedEntries.map((entry) => entry.file);
  if (changedFiles.includes("app/photo/page.tsx")) {
    warnings.push("app/photo/page.tsx ist nicht der aktive Streumail-Servicepfad. Bitte pruefen.");
  }

  const newHistorical = changedEntries.filter((entry) => {
    const isNew = entry.status.includes("?") || entry.status.includes("A");
    if (!isNew) return false;
    const file = entry.file;
    const name = file.toLowerCase();
    return /(replacement|backup|old|copy)/.test(name);
  }).map((entry) => entry.file);

  if (newHistorical.length) {
    warnings.push(
      [
        "Neue historische/alternative Datei erkannt. Bitte pruefen, ob wirklich noetig:",
        ...newHistorical.map((file) => `- ${file}`),
      ].join("\n")
    );
  }
}

function printSummary(changedFiles) {
  console.log("Protected-files check");
  console.log("=====================");
  console.log(`Geaenderte Pfade: ${changedFiles.length}`);
  console.log(`Allow-Flag: ${allowProtected ? "aktiv" : "nicht aktiv"}`);

  if (errors.length) {
    console.error("\nKritische Fehler:");
    for (const error of errors) console.error(`\n${error}`);
  }

  if (warnings.length) {
    console.warn("\nWarnungen:");
    for (const warning of warnings) console.warn(`\n${warning}`);
  }

  if (!errors.length && !warnings.length) {
    console.log("\nOK: Keine geschuetzten Dateien oder Laufzeitdaten betroffen.");
  } else if (!errors.length) {
    console.log("\nOK: Keine blockierenden Fehler. Warnungen bewusst pruefen.");
  }
}

const changedEntries = getChangedEntries();
const changedFiles = changedEntries.map((entry) => entry.file);

checkDataFiles(changedFiles);
checkEntryImports();
checkRedFiles(changedFiles);
checkYellowFiles(changedFiles);
checkActiveUiMultipleChanges(changedFiles);
checkHistoricalFiles(changedEntries);
printSummary(changedFiles);

if (errors.length) {
  process.exit(1);
}

process.exit(0);
