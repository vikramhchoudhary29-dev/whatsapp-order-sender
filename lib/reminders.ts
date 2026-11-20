import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendTemplateMessage, type WhatsAppTemplate } from "@/lib/whatsapp";

export type ReminderSlot = "morning" | "evening";

function templateForSlot(
  slot: ReminderSlot,
  settings: {
    template1Name: string;
    template1Language: string;
    template2Name: string;
    template2Language: string;
  }
): WhatsAppTemplate {
  const template =
    slot === "morning"
      ? { name: settings.template1Name.trim(), language: settings.template1Language.trim() }
      : { name: settings.template2Name.trim(), language: settings.template2Language.trim() };

  if (!template.name || !template.language) {
    throw new Error(
      `${slot === "morning" ? "Template 1" : "Template 2"} is not configured.`
    );
  }

  return template;
}

function indiaDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export async function runReminderSlot(slot: ReminderSlot) {
  const settings = await prisma.settings.findFirst();
  if (!settings) {
    throw new Error("Application settings are not configured.");
  }

  if ((slot === "morning" && !settings.morningEnabled) || (slot === "evening" && !settings.eveningEnabled)) {
    return { slot, skipped: true, reason: "This reminder is disabled.", total: 0, sent: 0, failed: 0, duplicates: 0 };
  }

  const template = templateForSlot(slot, settings);
  const scheduleKey = `${indiaDateKey(new Date())}:${slot}`;
  const customers = await prisma.customer.findMany({
    where: { active: true, optedIn: true },
    orderBy: { createdAt: "asc" },
  });

  let sent = 0;
  let failed = 0;
  let duplicates = 0;

  for (const customer of customers) {
    let logId: string;
    try {
      const log = await prisma.messageLog.create({
        data: {
          customerId: customer.id,
          scheduleKey,
          scheduledFor: new Date(),
          status: "PENDING",
          templateUsed: template.name,
        },
      });
      logId = log.id;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        duplicates++;
        continue;
      }
      throw error;
    }

    try {
      const metaMessageId = await sendTemplateMessage(customer.phone, template);
      await prisma.messageLog.update({
        where: { id: logId },
        data: { status: "SENT", sentAt: new Date(), metaMessageId },
      });
      sent++;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown Meta API error.";
      await prisma.messageLog.update({
        where: { id: logId },
        data: { status: "FAILED", errorMessage },
      });
      failed++;
    }
  }

  return { slot, scheduleKey, total: customers.length, sent, failed, duplicates, template };
}
