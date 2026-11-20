import { NextResponse } from "next/server";
import { handleScheduledReminder } from "@/lib/cron";

export async function POST(request: Request) {
  const slot = new URL(request.url).searchParams.get("slot");
  if (slot !== "morning" && slot !== "evening") {
    return NextResponse.json({ error: "slot must be morning or evening." }, { status: 400 });
  }

  return handleScheduledReminder(request, slot);
}
