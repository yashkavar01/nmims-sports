import { NextResponse } from "next/server";
import db from "../../../lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const tournamentId = body.tournamentId?.trim();
    const teamName = body.teamName?.trim();

    if (!tournamentId || !teamName) {
      return NextResponse.json(
        { error: "Tournament and team name are required." },
        { status: 400 }
      );
    }

    // Find the tournament
    const tournament = await db.orm.public.Tournament
      .where({ id: tournamentId })
      .first();

    if (!tournament) {
      return NextResponse.json(
        { error: "Tournament not found." },
        { status: 404 }
      );
    }

    // Check whether this team already exists for the same sport
    let team = await db.orm.public.Team
      .where({
        name: teamName,
        sportId: tournament.sportId,
      })
      .first();

    // Create the team if it doesn't exist
    if (!team) {
      team = await db.orm.public.Team.create({
        name: teamName,
        sportId: tournament.sportId,
      });
    }

    // Check whether the team is already registered
    const existingRegistration = await db.orm.public.TournamentTeam
      .where({
        tournamentId,
        teamId: team.id,
      })
      .first();

    if (existingRegistration) {
      return NextResponse.json(
        { error: "This team is already registered in the tournament." },
        { status: 409 }
      );
    }

    // Register team in tournament
    const registration = await db.orm.public.TournamentTeam.create({
      tournamentId,
      teamId: team.id,
    });

    return NextResponse.json(
      {
        team,
        registration,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Failed to add team." },
      { status: 500 }
    );
  }
}