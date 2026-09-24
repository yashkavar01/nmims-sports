import { NextResponse } from "next/server";

import db from "@/lib/db";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(
  request: Request,
  context: RouteContext
) {
  try {
    const { id: matchId } = await context.params;

    const body = await request.json();

    const scorerId =
      typeof body.scorerId === "string"
        ? body.scorerId
        : "";

    const assignedById =
      typeof body.assignedById === "string"
        ? body.assignedById
        : "";

    if (!scorerId || !assignedById) {
      return NextResponse.json(
        {
          error:
            "scorerId and assignedById are required.",
        },
        { status: 400 }
      );
    }

    const match =
      await db.orm.public.Match
        .where({ id: matchId })
        .first();

    if (!match) {
      return NextResponse.json(
        { error: "Match not found." },
        { status: 404 }
      );
    }

    if (match.status === "COMPLETED") {
      return NextResponse.json(
        {
          error:
            "A scorer cannot be assigned to a completed match.",
        },
        { status: 400 }
      );
    }

    const scorer =
      await db.orm.public.User
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
            "The selected user does not have the SCORER role.",
        },
        { status: 400 }
      );
    }

    const assignedBy =
      await db.orm.public.User
        .where({ id: assignedById })
        .first();

    if (!assignedBy) {
      return NextResponse.json(
        {
          error:
            "Assigning admin account was not found.",
        },
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
            "Only SPORTS_ADMIN or SUPER_ADMIN can assign scorers.",
        },
        { status: 403 }
      );
    }

    const existingAssignments =
      await db.orm.public.MatchScorerAssignment
        .where({
          matchId,
          status: "ASSIGNED",
        })
        .all();

    if (existingAssignments.length > 0) {
      for (const assignment of existingAssignments) {
        if (assignment.scorerId === scorerId) {
          return NextResponse.json({
            success: true,
            message: "This scorer is already assigned.",
            assignment,
          });
        }

        await db.orm.public.MatchScorerAssignment
          .where({ id: assignment.id })
          .update({
            status: "REVOKED",
            updatedAt: new Date(),
          });
      }
    }

    const assignment =
      await db.orm.public.MatchScorerAssignment.create({
        matchId,
        scorerId,
        assignedById,
        status: "ASSIGNED",
      });

    return NextResponse.json({
      success: true,
      message: "Scorer assigned successfully.",
      assignment,
    });
  } catch (error) {
    console.error("Scorer assignment error:", error);

    return NextResponse.json(
      {
        error:
          "Failed to assign scorer.",
      },
      { status: 500 }
    );
  }
}