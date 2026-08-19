import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const existingCustomer =
      await prisma.customer.findUnique({
        where: {
          id,
        },
      });

    if (!existingCustomer) {
      return NextResponse.json(
        {
          error: "Customer not found.",
        },
        {
          status: 404,
        }
      );
    }

    const data: {
      name?: string;
      active?: boolean;
      optedIn?: boolean;
    } = {};

    if (typeof body.name === "string") {
      const name = body.name.trim();

      if (!name) {
        return NextResponse.json(
          {
            error: "Customer name cannot be empty.",
          },
          {
            status: 400,
          }
        );
      }

      data.name = name;
    }

    if (typeof body.active === "boolean") {
      data.active = body.active;
    }

    if (typeof body.optedIn === "boolean") {
      data.optedIn = body.optedIn;
    }

    const customer = await prisma.customer.update({
      where: {
        id,
      },
      data,
    });

    return NextResponse.json(customer);
  } catch (error) {
    console.error(
      "PATCH /api/customers/[id] error:",
      error
    );

    return NextResponse.json(
      {
        error: "Failed to update customer.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const existingCustomer =
      await prisma.customer.findUnique({
        where: {
          id,
        },
      });

    if (!existingCustomer) {
      return NextResponse.json(
        {
          error: "Customer not found.",
        },
        {
          status: 404,
        }
      );
    }

    await prisma.customer.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "DELETE /api/customers/[id] error:",
      error
    );

    return NextResponse.json(
      {
        error: "Failed to delete customer.",
      },
      {
        status: 500,
      }
    );
  }
}