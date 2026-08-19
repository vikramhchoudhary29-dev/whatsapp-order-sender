import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

type SendRequestBody = {
  customerId?: string;
  all?: boolean;
};

type MetaResponse = {
  messaging_product?: string;
  contacts?: Array<{
    input?: string;
    wa_id?: string;
  }>;
  messages?: Array<{
    id?: string;
  }>;
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
};

function getMetaConfig() {
  const accessToken =
    process.env.META_ACCESS_TOKEN;

  const phoneNumberId =
    process.env.META_PHONE_NUMBER_ID;

  const apiVersion =
    process.env.META_API_VERSION || "v25.0";

  const imageUrl =
    process.env.META_TEMPLATE_IMAGE_URL?.trim();

  if (!accessToken) {
    throw new Error(
      "META_ACCESS_TOKEN is missing."
    );
  }

  if (!phoneNumberId) {
    throw new Error(
      "META_PHONE_NUMBER_ID is missing."
    );
  }

  if (!imageUrl) {
    throw new Error(
      "META_TEMPLATE_IMAGE_URL is missing."
    );
  }

  return {
    accessToken,
    phoneNumberId,
    apiVersion,
    imageUrl,
  };
}

function getSelectedTemplate(settings: {
  selectedTemplate: number;
  template1Name: string | null;
  template1Language: string | null;
  template2Name: string | null;
  template2Language: string | null;
}) {
  if (settings.selectedTemplate === 2) {
    return {
      number: 2,
      name:
        settings.template2Name?.trim() || "",
      language:
        settings.template2Language?.trim() || "",
    };
  }

  return {
    number: 1,
    name:
      settings.template1Name?.trim() || "",
    language:
      settings.template1Language?.trim() || "",
  };
}

async function sendToMeta(
  phone: string,
  templateName: string,
  templateLanguage: string
) {
  const {
    accessToken,
    phoneNumberId,
    apiVersion,
    imageUrl,
  } = getMetaConfig();

  const url =
    `https://graph.facebook.com/` +
    `${apiVersion}/` +
    `${phoneNumberId}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: phone,
    type: "template",
    template: {
      name: templateName,
      language: {
        code: templateLanguage,
      },
      components: [
        {
          type: "header",
          parameters: [
            {
              type: "image",
              image: {
                link: imageUrl,
              },
            },
          ],
        },
      ],
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data =
    (await response.json()) as MetaResponse;

  if (!response.ok) {
    const metaError =
      data.error?.message ||
      `Meta API returned HTTP ${response.status}`;

    throw new Error(metaError);
  }

  return data;
}

export async function POST(
  request: Request
) {
  try {
    const body =
      (await request.json()) as SendRequestBody;

    if (!body.customerId && !body.all) {
      return NextResponse.json(
        {
          error:
            "Provide customerId or set all=true.",
        },
        {
          status: 400,
        }
      );
    }

    const settings =
      await prisma.settings.findFirst();

    if (!settings) {
      return NextResponse.json(
        {
          error:
            "Application settings are not configured.",
        },
        {
          status: 400,
        }
      );
    }

    const selectedTemplate =
      getSelectedTemplate(settings);

    if (
      !selectedTemplate.name ||
      !selectedTemplate.language
    ) {
      return NextResponse.json(
        {
          error:
            `Template ${selectedTemplate.number} is not configured.`,
        },
        {
          status: 400,
        }
      );
    }

    let customers;

    if (body.customerId) {
      const customer =
        await prisma.customer.findUnique({
          where: {
            id: body.customerId,
          },
        });

      if (!customer) {
        return NextResponse.json(
          {
            error: "Customer not found.",
          },
          {
            status: 404,
          }
        );
      }

      if (!customer.active) {
        return NextResponse.json(
          {
            error:
              "This customer is inactive.",
          },
          {
            status: 400,
          }
        );
      }

      if (!customer.optedIn) {
        return NextResponse.json(
          {
            error:
              "This customer has not opted in.",
          },
          {
            status: 400,
          }
        );
      }

      customers = [customer];
    } else {
      customers =
        await prisma.customer.findMany({
          where: {
            active: true,
            optedIn: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        });
    }

    if (customers.length === 0) {
      return NextResponse.json(
        {
          error:
            "No active opted-in customers found.",
        },
        {
          status: 400,
        }
      );
    }

    const results = {
      total: customers.length,
      sent: 0,
      failed: 0,
      template: {
        number:
          selectedTemplate.number,
        name:
          selectedTemplate.name,
        language:
          selectedTemplate.language,
      },
      messages: [] as Array<{
        customerId: string;
        customerName: string;
        phone: string;
        status: "sent" | "failed";
        metaMessageId?: string;
        error?: string;
      }>,
    };

    for (const customer of customers) {
      const attemptedAt = new Date();

      try {
        const metaResponse =
          await sendToMeta(
            customer.phone,
            selectedTemplate.name,
            selectedTemplate.language
          );

        const metaMessageId =
          metaResponse.messages?.[0]?.id ||
          null;

        await prisma.messageLog.create({
          data: {
            customerId: customer.id,
            scheduledFor: attemptedAt,
            sentAt: new Date(),
            status: "SENT",
            templateUsed:
              selectedTemplate.name,
            metaMessageId,
            errorMessage: null,
          },
        });

        results.sent++;

        results.messages.push({
          customerId: customer.id,
          customerName: customer.name,
          phone: customer.phone,
          status: "sent",
          metaMessageId:
            metaMessageId || undefined,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Unknown Meta API error.";

        console.error(
          `WhatsApp send failed for ${customer.phone}:`,
          error
        );

        await prisma.messageLog.create({
          data: {
            customerId: customer.id,
            scheduledFor: attemptedAt,
            sentAt: null,
            status: "FAILED",
            templateUsed:
              selectedTemplate.name,
            metaMessageId: null,
            errorMessage,
          },
        });

        results.failed++;

        results.messages.push({
          customerId: customer.id,
          customerName: customer.name,
          phone: customer.phone,
          status: "failed",
          error: errorMessage,
        });
      }
    }

    return NextResponse.json({
      success: results.failed === 0,
      ...results,
    });
  } catch (error) {
    console.error(
      "POST /api/send error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to send WhatsApp message.",
      },
      {
        status: 500,
      }
    );
  }
}