import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

function normalizePhone(value: unknown): string {
  if (typeof value !== "string" && typeof value !== "number") {
    return "";
  }

  let phone = String(value).trim();

  phone = phone.replace(/[^\d+]/g, "");

  if (phone.startsWith("+")) {
    phone = phone.substring(1);
  }

  if (phone.startsWith("0") && phone.length === 10) {
    phone = `91${phone}`;
  }

  if (phone.length === 10) {
    phone = `91${phone}`;
  }

  return phone;
}

function parseBoolean(
  value: unknown,
  defaultValue: boolean
): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value !== "string") {
    return defaultValue;
  }

  const normalized = value.trim().toLowerCase();

  if (
    normalized === "true" ||
    normalized === "yes" ||
    normalized === "1"
  ) {
    return true;
  }

  if (
    normalized === "false" ||
    normalized === "no" ||
    normalized === "0"
  ) {
    return false;
  }

  return defaultValue;
}

export async function GET() {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(customers);
  } catch (error) {
    console.error("GET /api/customers error:", error);

    return NextResponse.json(
      {
        error: "Failed to load customers",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    /*
     * Bulk import
     */
    if (Array.isArray(body.customers)) {
      const rows = body.customers;

      if (rows.length === 0) {
        return NextResponse.json(
          {
            error: "No customers were provided.",
          },
          {
            status: 400,
          }
        );
      }

      const results = {
        imported: 0,
        updated: 0,
        skipped: 0,
        errors: [] as Array<{
          row: number;
          error: string;
        }>,
      };

      for (let index = 0; index < rows.length; index++) {
        const row = rows[index];

        const name =
          typeof row.name === "string"
            ? row.name.trim()
            : "";

        const phone = normalizePhone(row.phone);

        const optedIn = parseBoolean(
          row.optedIn,
          false
        );

        const active = parseBoolean(
          row.active,
          true
        );

        if (!name) {
          results.skipped++;

          results.errors.push({
            row: index + 2,
            error: "Customer name is missing.",
          });

          continue;
        }

        if (!phone) {
          results.skipped++;

          results.errors.push({
            row: index + 2,
            error: "WhatsApp number is missing.",
          });

          continue;
        }

        if (!/^\d{10,15}$/.test(phone)) {
          results.skipped++;

          results.errors.push({
            row: index + 2,
            error: `Invalid WhatsApp number: ${phone}`,
          });

          continue;
        }

        /*
         * Important:
         * We do NOT automatically opt customers in.
         * The CSV must explicitly contain optedIn=true/yes/1.
         */
        try {
          const existingCustomer =
            await prisma.customer.findUnique({
              where: {
                phone,
              },
            });

          if (existingCustomer) {
            await prisma.customer.update({
              where: {
                id: existingCustomer.id,
              },
              data: {
                name,
                active,
                optedIn,
              },
            });

            results.updated++;
          } else {
            await prisma.customer.create({
              data: {
                name,
                phone,
                active,
                optedIn,
              },
            });

            results.imported++;
          }
        } catch (error) {
          console.error(
            `CSV row ${index + 2} error:`,
            error
          );

          results.skipped++;

          results.errors.push({
            row: index + 2,
            error: "Could not save this customer.",
          });
        }
      }

      return NextResponse.json(results);
    }

    /*
     * Single customer
     */

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const phone = normalizePhone(body.phone);

    const optedIn =
      typeof body.optedIn === "boolean"
        ? body.optedIn
        : false;

    const active =
      typeof body.active === "boolean"
        ? body.active
        : true;

    if (!name) {
      return NextResponse.json(
        {
          error: "Customer name is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!phone) {
      return NextResponse.json(
        {
          error: "WhatsApp number is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!/^\d{10,15}$/.test(phone)) {
      return NextResponse.json(
        {
          error:
            "Enter a valid WhatsApp number including country code.",
        },
        {
          status: 400,
        }
      );
    }

    if (!optedIn) {
      return NextResponse.json(
        {
          error:
            "Customer must have WhatsApp opt-in before being added.",
        },
        {
          status: 400,
        }
      );
    }

    const existingCustomer =
      await prisma.customer.findUnique({
        where: {
          phone,
        },
      });

    if (existingCustomer) {
      return NextResponse.json(
        {
          error:
            "A customer with this WhatsApp number already exists.",
        },
        {
          status: 409,
        }
      );
    }

    const customer = await prisma.customer.create({
      data: {
        name,
        phone,
        active,
        optedIn,
      },
    });

    return NextResponse.json(customer, {
      status: 201,
    });
  } catch (error) {
    console.error("POST /api/customers error:", error);

    return NextResponse.json(
      {
        error: "Failed to save customers.",
      },
      {
        status: 500,
      }
    );
  }
}