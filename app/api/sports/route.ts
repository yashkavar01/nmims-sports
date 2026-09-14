import { NextResponse } from "next/server";
import db from "../../../lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name = body.name?.trim();
    const description = body.description?.trim() || null;

    if (!name) {
      return NextResponse.json(
        { error: "Sport name is required." },
        { status: 400 }
      );
    }

    const existingSport = await db.orm.public.Sport
      .where({ name })
      .first();

    if (existingSport) {
      return NextResponse.json(
        { error: "Sport already exists." },
        { status: 409 }
      );
    }

    const sport = await db.orm.public.Sport.create({
      name,
      description,
    });

    return NextResponse.json(sport, { status: 201 });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Failed to create sport." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();

    const id = body.id?.trim();
    const name = body.name?.trim();
    const description = body.description?.trim() || null;

    if (!id || !name) {
      return NextResponse.json(
        { error: "Sport ID and name are required." },
        { status: 400 }
      );
    }

    const existingSport = await db.orm.public.Sport
      .where({ name })
      .first();

    if (existingSport && existingSport.id !== id) {
      return NextResponse.json(
        { error: "Another sport already has this name." },
        { status: 409 }
      );
    }

    const sport = await db.orm.public.Sport
      .where({ id })
      .update({
        name,
        description,
      });

    if (!sport) {
      return NextResponse.json(
        { error: "Sport not found." },
        { status: 404 }
      );
    }

    return NextResponse.json(sport);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Failed to update sport." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "Sport ID is required." },
        { status: 400 }
      );
    }

    const sport = await db.orm.public.Sport
      .where({ id })
      .delete();

    if (!sport) {
      return NextResponse.json(
        { error: "Sport not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          "This sport cannot be deleted because it may already be in use.",
      },
      { status: 409 }
    );
  }
}