import { handleScheduledReminder } from "@/lib/cron";

export async function GET(request: Request) {
  return handleScheduledReminder(request, "morning");
}
