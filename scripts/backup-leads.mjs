import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const sourcePath = path.join(rootDir, "data", "leads.json");
const textControllingPath = path.join(rootDir, "data", "textControlling.json");
const remindersPath = path.join(rootDir, "data", "reminders.json");
const bulkPackagesPath = path.join(rootDir, "data", "bulkPackages.json");
const backupDir = path.join(rootDir, "data", "backups", "leads");
const retentionDays = Number(process.env.LEAD_BACKUP_RETENTION_DAYS || 90);

function pad(value) {
  return String(value).padStart(2, "0");
}

function timestamp(date = new Date()) {
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join("-");
}

function safeJsonArray(filePath) {
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf-8").replace(/^\uFEFF/, ""));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf-8");
}

function backupSourceFile(source, destination) {
  if (fs.existsSync(source)) {
    fs.copyFileSync(source, destination);
    return;
  }

  fs.writeFileSync(destination, "[]", "utf-8");
}

function hasNonEmptyBackup() {
  if (!fs.existsSync(backupDir)) return false;

  return fs
    .readdirSync(backupDir, { withFileTypes: true })
    .some((entry) => {
      if (!entry.isFile() || !entry.name.endsWith(".json")) return false;
      return safeJsonArray(path.join(backupDir, entry.name)).length > 0;
    });
}

function cleanupOldBackups() {
  if (!Number.isFinite(retentionDays) || retentionDays <= 0) return;
  if (!fs.existsSync(backupDir)) return;

  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

  for (const entry of fs.readdirSync(backupDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    const filePath = path.join(backupDir, entry.name);
    const stat = fs.statSync(filePath);
    if (stat.mtime.getTime() < cutoff) {
      fs.unlinkSync(filePath);
    }
  }
}

if (!fs.existsSync(sourcePath)) {
  fs.mkdirSync(path.dirname(sourcePath), { recursive: true });
  fs.writeFileSync(sourcePath, "[]", "utf-8");
}

fs.mkdirSync(backupDir, { recursive: true });

const leads = safeJsonArray(sourcePath);
const currentStamp = timestamp();

if (leads.length === 0 && hasNonEmptyBackup()) {
  console.log("Lead-Backup uebersprungen: leads.json ist leer, ein nicht-leeres Backup existiert bereits.");
  process.exit(0);
}

const backupPath = path.join(backupDir, `leads-${currentStamp}.json`);
const packagePath = path.join(backupDir, `crm-${currentStamp}.json`);
fs.copyFileSync(sourcePath, backupPath);

const textControlling = safeJsonArray(textControllingPath);
const reminders = safeJsonArray(remindersPath);
const bulkPackages = safeJsonArray(bulkPackagesPath);
const activeLeads = leads.filter((lead) => !lead?.archived);
const archivedLeads = leads.filter((lead) => lead?.archived);

writeJson(packagePath, {
  createdAt: new Date().toISOString(),
  counts: {
    leads: leads.length,
    activeLeads: activeLeads.length,
    archivedLeads: archivedLeads.length,
    textControlling: textControlling.length,
    reminders: reminders.length,
    bulkPackages: bulkPackages.length,
  },
  leads,
  activeLeads,
  archivedLeads,
  textControlling,
  reminders,
  bulkPackages,
});

backupSourceFile(textControllingPath, path.join(backupDir, `textControlling-${currentStamp}.json`));
backupSourceFile(remindersPath, path.join(backupDir, `reminders-${currentStamp}.json`));
backupSourceFile(bulkPackagesPath, path.join(backupDir, `bulkPackages-${currentStamp}.json`));
cleanupOldBackups();

console.log(`Lead-Backup erstellt: ${backupPath}`);
console.log(`CRM-Paket-Backup erstellt: ${packagePath}`);
console.log(`Gesicherte Leads: ${leads.length} aktiv: ${activeLeads.length} archiviert: ${archivedLeads.length}`);
