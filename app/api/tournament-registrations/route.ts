import { NextResponse } from "next/server";
import db from "../../../lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const teamId = body.teamId?.trim();
    const tournamentId = body.tournamentId?.trim();

    if (!teamId || !tournamentId) {
      return NextResponse.json(
        {
          error: "Team and tournament are required.",
        },
        { status: 400 }
      );
    }

    const team = await db.orm.public.Team
      .where({ id: teamId })
      .first();

    if (!team) {
      return NextResponse.json(
        {
          error: "Team does not exist.",
        },
        { status: 404 }
      );
    }

    const tournament = await db.orm.public.Tournament
      .where({ id: tournamentId })
      .first();

    if (!tournament) {
      return NextResponse.json(
        {
          error: "Tournament does not exist.",
        },
        { status: 404 }
      );
    }

    if (team.sportId !== tournament.sportId) {
      return NextResponse.json(
        {
          error: "Team sport does not match tournament sport.",
        },
        { status: 400 }
      );
    }

    const existingRegistration =
      await db.orm.public.TournamentRegistrationRequest
        .where({
          tournamentId,
          teamId,
        })
        .first();

    if (existingRegistration) {
      return NextResponse.json(
        {
          error: `Registration already exists with status: ${existingRegistration.status}.`,
        },
        { status: 409 }
      );
    }

    const registration =
      await db.orm.public.TournamentRegistrationRequest.create({
        tournamentId,
        teamId,
        requestedById: team.createdById,
        status: "PENDING",
      });

    return NextResponse.json(
      {
        registration,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "Failed to create registration request.",
      },
      { status: 500 }
    );
  }
}