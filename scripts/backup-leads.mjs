import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const sourcePath = path.join(rootDir, "data", "leads.json");
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

if (leads.length === 0 && hasNonEmptyBackup()) {
  console.log("Lead-Backup uebersprungen: leads.json ist leer, ein nicht-leeres Backup existiert bereits.");
  process.exit(0);
}

const backupPath = path.join(backupDir, `leads-${timestamp()}.json`);
fs.copyFileSync(sourcePath, backupPath);
cleanupOldBackups();

console.log(`Lead-Backup erstellt: ${backupPath}`);
console.log(`Gesicherte Leads: ${leads.length}`);
