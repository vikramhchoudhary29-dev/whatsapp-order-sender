import { NextResponse } from "next/server";

type MetaTemplateComponent = {
  type?: string;
  format?: string;
  text?: string;
  example?: unknown;
  buttons?: unknown;
};

type MetaTemplate = {
  id?: string;
  name?: string;
  language?: string;
  status?: string;
  category?: string;
  components?: MetaTemplateComponent[];
};

type MetaTemplatesResponse = {
  data?: MetaTemplate[];
  paging?: unknown;
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
};

export async function GET() {
  try {
    const accessToken = process.env.META_ACCESS_TOKEN;
    const wabaId = process.env.META_WABA_ID;
    const apiVersion =
      process.env.META_API_VERSION || "v25.0";

    if (!accessToken) {
      return NextResponse.json(
        {
          error: "META_ACCESS_TOKEN is missing.",
        },
        { status: 500 }
      );
    }

    if (!wabaId) {
      return NextResponse.json(
        {
          error: "META_WABA_ID is missing.",
        },
        { status: 500 }
      );
    }

    const url = new URL(
      `https://graph.facebook.com/${apiVersion}/${wabaId}/message_templates`
    );

    url.searchParams.set(
      "fields",
      "id,name,language,status,category,components"
    );

    url.searchParams.set("limit", "100");

    const response = await fetch(
      url.toString(),
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      }
    );

    const data =
      (await response.json()) as MetaTemplatesResponse;

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: data.error || {
            message:
              `Meta returned HTTP ${response.status}.`,
          },
        },
        {
          status: response.status,
        }
      );
    }

    const templates = (data.data || []).map(
      (template) => ({
        id: template.id || null,
        name: template.name || null,
        language: template.language || null,
        status: template.status || null,
        category: template.category || null,
        components:
          template.components || [],
      })
    );

    return NextResponse.json({
      success: true,
      templates,
    });
  } catch (error) {
    console.error(
      "GET /api/meta/templates error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to retrieve Meta templates.",
      },
      {
        status: 500,
      }
    );
  }
}