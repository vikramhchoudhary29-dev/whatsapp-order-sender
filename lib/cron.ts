import { NextResponse } from "next/server";
import { runReminderSlot, type ReminderSlot } from "@/lib/reminders";

export async function handleScheduledReminder(
  request: Request,
  slot: ReminderSlot
) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await runReminderSlot(slot);
    return NextResponse.json({ success: result.failed === 0, ...result });
  } catch (error) {
    console.error(`Scheduled ${slot} reminder failed:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send reminders." },
      { status: 500 }
    );
  }
}
