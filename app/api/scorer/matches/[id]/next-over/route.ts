import { NextRequest, NextResponse } from "next/server";

import db from "../../../../../../lib/db";

type NextOverRequest = {
  bowlerId?: string;
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: matchId } = await params;

    const body =
      (await request.json()) as NextOverRequest;

    const bowlerId = body.bowlerId?.trim();

    if (!bowlerId) {
      return NextResponse.json(
        {
          error: "Bowler is required.",
        },
        { status: 400 }
      );
    }

    const scorer =
      await db.orm.public.User
        .where({
          email: "scorer@nmims.local",
        })
        .first();

    if (
      !scorer ||
      scorer.role !== "SCORER"
    ) {
      return NextResponse.json(
        {
          error:
            "Scorer account not found.",
        },
        { status: 403 }
      );
    }

    const match =
      await db.orm.public.Match
        .where({
          id: matchId,
        })
        .first();

    if (!match) {
      return NextResponse.json(
        {
          error: "Match not found.",
        },
        { status: 404 }
      );
    }

    if (match.status !== "LIVE") {
      return NextResponse.json(
        {
          error:
            "Only live matches can start a new over.",
        },
        { status: 409 }
      );
    }

    const assignment =
      await db.orm.public.MatchScorerAssignment
        .where({
          matchId,
          scorerId: scorer.id,
        })
        .first();

    if (
      !assignment ||
      (assignment.status !== "ASSIGNED" &&
        assignment.status !== "ACTIVE")
    ) {
      return NextResponse.json(
        {
          error:
            "You are not assigned as the scorer for this match.",
        },
        { status: 403 }
      );
    }

    const innings =
      await db.orm.public.CricketInnings
        .where({
          matchId,
        })
        .all();

    if (innings.length === 0) {
      return NextResponse.json(
        {
          error:
            "No innings has been started.",
        },
        { status: 409 }
      );
    }

    const currentInnings = [
      ...innings,
    ].sort(
      (a, b) =>
        b.inningsNumber -
        a.inningsNumber
    )[0];

    if (
      currentInnings.status !==
      "IN_PROGRESS"
    ) {
      return NextResponse.json(
        {
          error:
            "The current innings is not in progress.",
        },
        { status: 409 }
      );
    }

    const overs =
      await db.orm.public.CricketOver
        .where({
          inningsId:
            currentInnings.id,
        })
        .all();

    if (overs.length === 0) {
      return NextResponse.json(
        {
          error:
            "No over exists for the current innings.",
        },
        { status: 409 }
      );
    }

    const currentOver = [
      ...overs,
    ].sort(
      (a, b) =>
        b.overNumber -
        a.overNumber
    )[0];

    const deliveries =
      await db.orm.public.CricketDelivery
        .where({
          overId:
            currentOver.id,
        })
        .all();

    const legalBalls =
      deliveries.filter(
        (delivery) =>
          delivery.legalBall
      ).length;

    if (legalBalls < 6) {
      return NextResponse.json(
        {
          error:
            "The current over is not complete yet.",
        },
        { status: 409 }
      );
    }

    const matchPlayers =
      await db.orm.public.MatchPlayer
        .where({
          matchId,
        })
        .all();

    const bowlerInPlayingXI =
      matchPlayers.find(
        (player) =>
          player.playerId ===
            bowlerId &&
          player.teamId ===
            currentInnings.bowlingTeamId &&
          player.role === "PLAYING"
      );

    if (!bowlerInPlayingXI) {
      return NextResponse.json(
        {
          error:
            "The selected bowler is not part of the bowling Playing XI.",
        },
        { status: 400 }
      );
    }

    if (
      currentOver.bowlerId ===
      bowlerId
    ) {
      return NextResponse.json(
        {
          error:
            "A bowler cannot bowl consecutive overs.",
        },
        { status: 400 }
      );
    }

    const existingNextOver =
      overs.find(
        (over) =>
          over.overNumber ===
          currentOver.overNumber + 1
      );

    if (existingNextOver) {
      return NextResponse.json(
        {
          error:
            "The next over has already been created.",
        },
        { status: 409 }
      );
    }

    const nextOverNumber =
      currentOver.overNumber + 1;

    const nextOver =
      await db.orm.public.CricketOver.create(
        {
          inningsId:
            currentInnings.id,
          overNumber:
            nextOverNumber,
          bowlerId,
        }
      );

    await db.orm.public.MatchEvent.create(
      {
        matchId,
        playerId: bowlerId,
        teamId:
          currentInnings.bowlingTeamId,
        type: "OVER_STARTED",
        data: JSON.stringify({
          inningsId:
            currentInnings.id,
          previousOverId:
            currentOver.id,
          previousOverNumber:
            currentOver.overNumber,
          overId: nextOver.id,
          overNumber:
            nextOverNumber,
          bowlerId,
          score:
            currentInnings.runs,
          wickets:
            currentInnings.wickets,
          legalBalls:
            currentInnings.legalBalls,
        }),
      }
    );

    return NextResponse.json(
      {
        success: true,
        over: nextOver,
        state: {
          score:
            currentInnings.runs,
          wickets:
            currentInnings.wickets,
          legalBalls:
            currentInnings.legalBalls,
          overNumber:
            nextOverNumber,
          ballNumber: 0,
          bowlerId,
          overComplete: false,
          lastAction:
            `Over ${nextOverNumber} started`,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Next over API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to start next over.",
      },
      { status: 500 }
    );
  }
}