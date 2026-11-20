type MetaResponse = {
  messages?: Array<{ id?: string }>;
  error?: { message?: string };
};

function getMetaConfig() {
  const accessToken = process.env.META_ACCESS_TOKEN;
  const phoneNumberId = process.env.META_PHONE_NUMBER_ID;
  const imageUrl = process.env.META_TEMPLATE_IMAGE_URL?.trim();

  if (!accessToken || !phoneNumberId || !imageUrl) {
    throw new Error(
      "Meta configuration is incomplete. Set META_ACCESS_TOKEN, META_PHONE_NUMBER_ID, and META_TEMPLATE_IMAGE_URL."
    );
  }

  return {
    accessToken,
    phoneNumberId,
    imageUrl,
    apiVersion: process.env.META_API_VERSION || "v25.0",
  };
}

export type WhatsAppTemplate = {
  name: string;
  language: string;
};

export async function sendTemplateMessage(
  phone: string,
  template: WhatsAppTemplate
) {
  const { accessToken, phoneNumberId, imageUrl, apiVersion } =
    getMetaConfig();

  const response = await fetch(
    `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: phone,
        type: "template",
        template: {
          name: template.name,
          language: { code: template.language },
          components: [
            {
              type: "header",
              parameters: [{ type: "image", image: { link: imageUrl } }],
            },
          ],
        },
      }),
    }
  );

  const data = (await response.json()) as MetaResponse;

  if (!response.ok) {
    throw new Error(
      data.error?.message || `Meta API returned HTTP ${response.status}.`
    );
  }

  return data.messages?.[0]?.id ?? null;
}
