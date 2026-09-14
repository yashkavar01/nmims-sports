import { NextResponse } from "next/server";
import { Temporal } from "temporal-polyfill/full";
import db from "../../../lib/db";

export async function GET() {
  try {
    const matches = await db.orm.public.Match.all();

    return NextResponse.json(matches);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Failed to fetch matches." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      sportId,
      tournamentId,
      homeTeamId,
      awayTeamId,
      scheduledAt,
      venue,
      round,
      matchNumber,
    } = body;

    if (
      !sportId ||
      !tournamentId ||
      !homeTeamId ||
      !awayTeamId
    ) {
      return NextResponse.json(
        { error: "Sport, tournament, and both teams are required." },
        { status: 400 }
      );
    }

    if (homeTeamId === awayTeamId) {
      return NextResponse.json(
        { error: "A team cannot play against itself." },
        { status: 400 }
      );
    }

    const sport = await db.orm.public.Sport
      .where({ id: sportId })
      .first();

    if (!sport) {
      return NextResponse.json(
        { error: "Sport not found." },
        { status: 404 }
      );
    }

    const tournament = await db.orm.public.Tournament
      .where({ id: tournamentId })
      .first();

    if (!tournament) {
      return NextResponse.json(
        { error: "Tournament not found." },
        { status: 404 }
      );
    }

    if (tournament.sportId !== sportId) {
      return NextResponse.json(
        { error: "Tournament does not belong to the selected sport." },
        { status: 400 }
      );
    }

    const homeTeam = await db.orm.public.Team
      .where({ id: homeTeamId })
      .first();

    const awayTeam = await db.orm.public.Team
      .where({ id: awayTeamId })
      .first();

    if (!homeTeam || !awayTeam) {
      return NextResponse.json(
        { error: "One or both teams were not found." },
        { status: 404 }
      );
    }

    if (
      homeTeam.sportId !== sportId ||
      awayTeam.sportId !== sportId
    ) {
      return NextResponse.json(
        { error: "Both teams must belong to the selected sport." },
        { status: 400 }
      );
    }

    const homeRegistration =
      await db.orm.public.TournamentTeam
        .where({
          tournamentId,
          teamId: homeTeamId,
        })
        .first();

    const awayRegistration =
      await db.orm.public.TournamentTeam
        .where({
          tournamentId,
          teamId: awayTeamId,
        })
        .first();

    if (!homeRegistration || !awayRegistration) {
      return NextResponse.json(
        {
          error:
            "Both teams must be officially registered in this tournament.",
        },
        { status: 400 }
      );
    }

    let scheduledInstant = null;

    if (scheduledAt) {
      scheduledInstant = Temporal.Instant.from(
        scheduledAt
      );
    }

    const match = await db.orm.public.Match.create({
      sportId,
      tournamentId,
      homeTeamId,
      awayTeamId,
      scheduledAt: scheduledInstant,
      venue: venue?.trim() || null,
      round: round?.trim() || null,
      matchNumber:
        matchNumber === "" ||
        matchNumber === null ||
        matchNumber === undefined
          ? null
          : Number(matchNumber),
      status: "SCHEDULED",
    });

    return NextResponse.json(match, { status: 201 });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Failed to create match." },
      { status: 500 }
    );
  }
}