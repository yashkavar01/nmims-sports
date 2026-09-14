import { Temporal } from "temporal-polyfill/full";
import { NextResponse } from "next/server";
import db from "../../../lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name = body.name?.trim();
    const sportId = body.sportId?.trim();
    const startDate = body.startDate?.trim();
    const endDate = body.endDate?.trim();

    if (!name || !sportId) {
      return NextResponse.json(
        { error: "Tournament name and sport are required." },
        { status: 400 }
      );
    }

    const sport = await db.orm.public.Sport
      .where({ id: sportId })
      .first();

    if (!sport) {
      return NextResponse.json(
        { error: "Selected sport does not exist." },
        { status: 404 }
      );
    }

    const tournament = await db.orm.public.Tournament.create({
      name,
      sportId,
      startDate: startDate
        ? Temporal.Instant.from(`${startDate}T00:00:00Z`)
        : null,
      endDate: endDate
        ? Temporal.Instant.from(`${endDate}T00:00:00Z`)
        : null,
    });

    return NextResponse.json(tournament, { status: 201 });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Failed to create tournament." },
      { status: 500 }
    );
  }
}