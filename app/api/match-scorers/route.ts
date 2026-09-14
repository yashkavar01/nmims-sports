import { NextResponse } from "next/server";
import db from "../../../lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      matchId,
      scorerId,
      assignedById,
    } = body;

    if (!matchId || !scorerId || !assignedById) {
      return NextResponse.json(
        {
          error:
            "Match, scorer, and assigning admin are required.",
        },
        { status: 400 }
      );
    }

    const match = await db.orm.public.Match
      .where({ id: matchId })
      .first();

    if (!match) {
      return NextResponse.json(
        { error: "Match not found." },
        { status: 404 }
      );
    }

    const scorer = await db.orm.public.User
      .where({ id: scorerId })
      .first();

    if (!scorer) {
      return NextResponse.json(
        { error: "Scorer not found." },
        { status: 404 }
      );
    }

    if (scorer.role !== "SCORER") {
      return NextResponse.json(
        {
          error:
            "Selected user is not registered as a scorer.",
        },
        { status: 400 }
      );
    }

    const assignedBy = await db.orm.public.User
      .where({ id: assignedById })
      .first();

    if (!assignedBy) {
      return NextResponse.json(
        { error: "Assigning user not found." },
        { status: 404 }
      );
    }

    if (
      assignedBy.role !== "SPORTS_ADMIN" &&
      assignedBy.role !== "SUPER_ADMIN"
    ) {
      return NextResponse.json(
        {
          error:
            "Only Sports Admin or Super Admin can assign scorers.",
        },
        { status: 403 }
      );
    }

    const existingAssignments =
      await db.orm.public.MatchScorerAssignment
        .where({ matchId })
        .all();

    const existingActiveAssignment =
      existingAssignments.find(
        (assignment) =>
          assignment.status === "ASSIGNED"
      );

    if (existingActiveAssignment) {
      return NextResponse.json(
        {
          error:
            "This match already has an assigned scorer.",
        },
        { status: 400 }
      );
    }

    const assignment =
      await db.orm.public.MatchScorerAssignment.create({
        matchId,
        scorerId,
        assignedById,
        status: "ASSIGNED",
      });

    return NextResponse.json(
      assignment,
      { status: 201 }
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Failed to assign scorer." },
      { status: 500 }
    );
  }
}