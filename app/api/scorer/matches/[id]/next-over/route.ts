import { NextRequest, NextResponse } from "next/server";

import db from "../../../../../../lib/db";

type NextOverRequest = {
  bowlerId?: string;
};

type InningsStateData = {
  inningsId?: string;
  overId?: string;
  overNumber?: number;
  ballNumber?: number;
  strikerId?: string;
  nonStrikerId?: string;
  bowlerId?: string;
  score?: number;
  wickets?: number;
  legalBalls?: number;
  overComplete?: boolean;
  inningsComplete?: boolean;
  lastAction?: string;
  deliveryType?: string;
  runsOffBat?: number;
  extras?: number;
  totalRuns?: number;
  freeHit?: boolean;
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

    const config =
      await db.orm.public.CricketMatchConfig
        .where({
          matchId,
        })
        .first();

    if (!config) {
      return NextResponse.json(
        {
          error:
            "Cricket match configuration not found.",
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
            "No over has been started.",
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
          overId: currentOver.id,
        })
        .all();

    const legalBallsInOver =
      deliveries.filter(
        (delivery) =>
          delivery.legalBall
      ).length;

    if (legalBallsInOver < 6) {
      return NextResponse.json(
        {
          error:
            "The current over is not complete.",
        },
        { status: 409 }
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
        { status: 409 }
      );
    }

    const matchPlayers =
      await db.orm.public.MatchPlayer
        .where({
          matchId,
        })
        .all();

    const selectedBowler =
      matchPlayers.find(
        (item) =>
          item.playerId === bowlerId &&
          item.teamId ===
            currentInnings.bowlingTeamId &&
          item.role === "PLAYING"
      );

    if (!selectedBowler) {
      return NextResponse.json(
        {
          error:
            "Selected bowler is not in the bowling team's Playing XI.",
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
            "The next over has already been started.",
        },
        { status: 409 }
      );
    }

    const events =
      await db.orm.public.MatchEvent
        .where({
          matchId,
          type: "INNINGS_STATE",
        })
        .all();

    const stateEvents = events
      .filter((event) => {
        if (!event.data) {
          return false;
        }

        try {
          const data =
            JSON.parse(
              event.data
            ) as InningsStateData;

          return (
            data.inningsId ===
            currentInnings.id
          );
        } catch {
          return false;
        }
      })
      .sort(
        (a, b) =>
          b.timestamp.epochMilliseconds -
          a.timestamp.epochMilliseconds
      );

    if (stateEvents.length === 0) {
      return NextResponse.json(
        {
          error:
            "Current innings state could not be found.",
        },
        { status: 409 }
      );
    }

    let latestState: InningsStateData;

    try {
      latestState =
        JSON.parse(
          stateEvents[0].data ?? "{}"
        ) as InningsStateData;
    } catch {
      return NextResponse.json(
        {
          error:
            "Current innings state is invalid.",
        },
        { status: 500 }
      );
    }

    const strikerId =
      latestState.strikerId;

    const nonStrikerId =
      latestState.nonStrikerId;

    if (!strikerId || !nonStrikerId) {
      return NextResponse.json(
        {
          error:
            "Both striker and non-striker must be selected before starting the next over.",
        },
        { status: 409 }
      );
    }

    const freeHit =
      latestState.freeHit ?? false;

    const nextOver =
      await db.orm.public.CricketOver.create({
        inningsId:
          currentInnings.id,
        overNumber:
          currentOver.overNumber + 1,
        bowlerId,
      });

    await db.orm.public.MatchEvent.create({
      matchId,
      playerId: bowlerId,
      teamId:
        currentInnings.bowlingTeamId,
      type: "OVER_STARTED",
      data: JSON.stringify({
        inningsId:
          currentInnings.id,
        overId:
          nextOver.id,
        overNumber:
          nextOver.overNumber,
        strikerId,
        nonStrikerId,
        bowlerId,
        score:
          currentInnings.runs,
        wickets:
          currentInnings.wickets,
        legalBalls:
          currentInnings.legalBalls,
        freeHit,
      }),
    });

    const lastAction =
      `Over ${nextOver.overNumber} started.`;

    await db.orm.public.MatchEvent.create({
      matchId,
      playerId: strikerId,
      teamId:
        currentInnings.battingTeamId,
      type: "INNINGS_STATE",
      data: JSON.stringify({
        inningsId:
          currentInnings.id,
        overId:
          nextOver.id,
        overNumber:
          nextOver.overNumber,
        ballNumber: 0,
        strikerId,
        nonStrikerId,
        bowlerId,
        score:
          currentInnings.runs,
        wickets:
          currentInnings.wickets,
        legalBalls:
          currentInnings.legalBalls,
        overComplete: false,
        inningsComplete: false,
        lastAction,
        deliveryType:
          "OVER_STARTED",
        runsOffBat: 0,
        extras: 0,
        totalRuns: 0,
        freeHit,
      }),
    });

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
            nextOver.overNumber,
          ballNumber: 0,
          strikerId,
          nonStrikerId,
          bowlerId,
          overComplete: false,
          inningsComplete: false,
          lastAction,
          freeHit,
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
          "Failed to start the next over.",
      },
      { status: 500 }
    );
  }
}