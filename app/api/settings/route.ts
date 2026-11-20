import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEFAULT_SETTINGS = {
  remindersEnabled: true,
  morningEnabled: true,
  morningTime: "10:00",
  eveningEnabled: true,
  eveningTime: "17:00",
  timezone: "Asia/Kolkata",
  template1Name: "",
  template1Language: "en_US",
  template2Name: "",
  template2Language: "en_US",
  selectedTemplate: 1,
};

export async function GET() {
  try {
    let settings = await prisma.settings.findFirst();

    if (!settings) {
      settings = await prisma.settings.create({
        data: DEFAULT_SETTINGS,
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("GET /api/settings error:", error);

    return NextResponse.json(
      {
        error: "Failed to load settings",
      },
      {
        status: 500,
      }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();

    const existingSettings = await prisma.settings.findFirst();

    const data = {
      remindersEnabled:
        typeof body.remindersEnabled === "boolean"
          ? body.remindersEnabled
          : DEFAULT_SETTINGS.remindersEnabled,

      morningEnabled:
        typeof body.morningEnabled === "boolean"
          ? body.morningEnabled
          : DEFAULT_SETTINGS.morningEnabled,

      morningTime:
        typeof body.morningTime === "string"
          ? body.morningTime
          : DEFAULT_SETTINGS.morningTime,

      eveningEnabled:
        typeof body.eveningEnabled === "boolean"
          ? body.eveningEnabled
          : DEFAULT_SETTINGS.eveningEnabled,

      eveningTime:
        typeof body.eveningTime === "string"
          ? body.eveningTime
          : DEFAULT_SETTINGS.eveningTime,

      timezone:
        typeof body.timezone === "string"
          ? body.timezone
          : DEFAULT_SETTINGS.timezone,

      template1Name:
        typeof body.template1Name === "string"
          ? body.template1Name.trim()
          : DEFAULT_SETTINGS.template1Name,

      template1Language:
        typeof body.template1Language === "string"
          ? body.template1Language.trim()
          : DEFAULT_SETTINGS.template1Language,

      template2Name:
        typeof body.template2Name === "string"
          ? body.template2Name.trim()
          : DEFAULT_SETTINGS.template2Name,

      template2Language:
        typeof body.template2Language === "string"
          ? body.template2Language.trim()
          : DEFAULT_SETTINGS.template2Language,

      selectedTemplate:
        body.selectedTemplate === 2 ? 2 : 1,
    };

    const settings = existingSettings
      ? await prisma.settings.update({
          where: {
            id: existingSettings.id,
          },
          data,
        })
      : await prisma.settings.create({
          data,
        });

    return NextResponse.json(settings);
  } catch (error) {
    console.error("PUT /api/settings error:", error);

    return NextResponse.json(
      {
        error: "Failed to save settings",
      },
      {
        status: 500,
      }
    );
  }
}
