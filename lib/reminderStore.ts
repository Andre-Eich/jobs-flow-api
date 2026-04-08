import fs from "fs";
import path from "path";

const filePath = path.join(process.cwd(), "data", "reminders.json");

export type ReminderEntry = {
  emailId: string;
  reminderSentAt: string;
};

export function getReminders(): ReminderEntry[] {
  try {
    const file = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(file);
  } catch {
    return [];
  }
}

export function saveReminder(emailId: string) {
  const reminders = getReminders();

  if (reminders.find((r) => r.emailId === emailId)) {
    return;
  }

  reminders.push({
    emailId,
    reminderSentAt: new Date().toISOString(),
  });

  fs.writeFileSync(filePath, JSON.stringify(reminders, null, 2));
}

export function isReminderSent(emailId: string) {
  const reminders = getReminders();
  return reminders.some((r) => r.emailId === emailId);
}