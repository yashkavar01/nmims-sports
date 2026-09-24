import { NextRequest, NextResponse } from "next/server";

import db from "../../../../../../lib/db";

type DeliveryRequest = {
  strikerId?: string;
  nonStrikerId?: string;
  bowlerId?: string;
  runsOffBat?: number;
};

const VALID_RUNS = new Set([0, 1, 2, 3, 4, 6]);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: matchId } = await params;
    const body = (await request.json()) as DeliveryRequest;

    const strikerId = body.strikerId?.trim();
    const nonStrikerId = body.nonStrikerId?.trim();
    const bowlerId = body.bowlerId?.trim();
    const runsOffBat = body.runsOffBat;

    if (!strikerId || !nonStrikerId || !bowlerId) {
      return NextResponse.json(
        {
          error:
            "Striker, non-striker and bowler are required.",
        },
        { status: 400 }
      );
    }

    if (strikerId === nonStrikerId) {
      return NextResponse.json(
        {
          error:
            "Striker and non-striker must be different players.",
        },
        { status: 400 }
      );
    }

    if (
      typeof runsOffBat !== "number" ||
      !VALID_RUNS.has(runsOffBat)
    ) {
      return NextResponse.json(
        {
          error:
            "Runs must be one of 0, 1, 2, 3, 4 or 6.",
        },
        { status: 400 }
      );
    }

    const scorer = await db.orm.public.User
      .where({
        email: "scorer@nmims.local",
      })
      .first();

    if (!scorer || scorer.role !== "SCORER") {
      return NextResponse.json(
        {
          error: "Scorer account not found.",
        },
        { status: 403 }
      );
    }

    const match = await db.orm.public.Match
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
          error: "Only live matches can receive deliveries.",
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

    const innings = await db.orm.public.CricketInnings
      .where({
        matchId,
      })
      .all();

    if (innings.length === 0) {
      return NextResponse.json(
        {
          error: "No innings has been started.",
        },
        { status: 409 }
      );
    }

    const currentInnings = [...innings].sort(
      (a, b) => b.inningsNumber - a.inningsNumber
    )[0];

    if (currentInnings.status !== "IN_PROGRESS") {
      return NextResponse.json(
        {
          error: "The current innings is not in progress.",
        },
        { status: 409 }
      );
    }

    const openingEvents =
      await db.orm.public.MatchEvent
        .where({
          matchId,
          type: "INNINGS_OPENING_SETUP",
        })
        .all();

    const inningsOpeningEvents = openingEvents
      .filter((event) => {
        if (!event.data) {
          return false;
        }

        try {
          const data = JSON.parse(event.data) as {
            inningsId?: string;
          };

          return data.inningsId === currentInnings.id;
        } catch {
          return false;
        }
      })
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() -
          new Date(a.timestamp).getTime()
      );

    if (inningsOpeningEvents.length === 0) {
      return NextResponse.json(
        {
          error:
            "Opening setup has not been completed for this innings.",
        },
        { status: 409 }
      );
    }

    const overs = await db.orm.public.CricketOver
      .where({
        inningsId: currentInnings.id,
      })
      .all();

    if (overs.length === 0) {
      return NextResponse.json(
        {
          error:
            "No over has been created for the current innings.",
        },
        { status: 409 }
      );
    }

    const currentOver = [...overs].sort(
      (a, b) => b.overNumber - a.overNumber
    )[0];

    const deliveries = await db.orm.public.CricketDelivery
      .where({
        overId: currentOver.id,
      })
      .all();

    if (deliveries.length >= 6) {
      return NextResponse.json(
        {
          error:
            "This over is complete. Start the next over before recording another ball.",
          overComplete: true,
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

    const playingPlayers = matchPlayers.filter(
      (player) => player.role === "PLAYING"
    );

    const striker = playingPlayers.find(
      (player) =>
        player.playerId === strikerId &&
        player.teamId === currentInnings.battingTeamId
    );

    const nonStriker = playingPlayers.find(
      (player) =>
        player.playerId === nonStrikerId &&
        player.teamId === currentInnings.battingTeamId
    );

    const bowler = playingPlayers.find(
      (player) =>
        player.playerId === bowlerId &&
        player.teamId === currentInnings.bowlingTeamId
    );

    if (!striker) {
      return NextResponse.json(
        {
          error:
            "The selected striker is not part of the batting Playing XI.",
        },
        { status: 400 }
      );
    }

    if (!nonStriker) {
      return NextResponse.json(
        {
          error:
            "The selected non-striker is not part of the batting Playing XI.",
        },
        { status: 400 }
      );
    }

    if (!bowler) {
      return NextResponse.json(
        {
          error:
            "The selected bowler is not part of the bowling Playing XI.",
        },
        { status: 400 }
      );
    }

    const player = await db.orm.public.Player
      .where({
        id: bowlerId,
      })
      .first();

    if (!player) {
      return NextResponse.json(
        {
          error: "Bowler player record not found.",
        },
        { status: 400 }
      );
    }

    const ballNumber = deliveries.length + 1;

    const delivery =
      await db.orm.public.CricketDelivery.create({
        inningsId: currentInnings.id,
        overId: currentOver.id,
        ballNumber,
        legalBall: true,
        strikerId,
        nonStrikerId,
        bowlerId,
        runsOffBat,
        extras: 0,
        totalRuns: runsOffBat,
        extraType: null,
        wicket: false,
        wicketType: null,
        dismissedPlayerId: null,
        data: JSON.stringify({
          scorerId: scorer.id,
          deliveryType: "NORMAL",
        }),
      });

    await db.orm.public.CricketInnings
      .where({
        id: currentInnings.id,
      })
      .update({
        runs: currentInnings.runs + runsOffBat,
        legalBalls: currentInnings.legalBalls + 1,
      });

    const overComplete = ballNumber === 6;

    let nextStrikerId = strikerId;
    let nextNonStrikerId = nonStrikerId;

    if (runsOffBat % 2 === 1) {
      nextStrikerId = nonStrikerId;
      nextNonStrikerId = strikerId;
    }

    if (overComplete) {
      const endOverStriker = nextStrikerId;

      nextStrikerId = nextNonStrikerId;
      nextNonStrikerId = endOverStriker;
    }

    await db.orm.public.MatchEvent.create({
      matchId,
      playerId: strikerId,
      teamId: currentInnings.battingTeamId,
      type: "INNINGS_STATE",
      data: JSON.stringify({
        inningsId: currentInnings.id,
        overId: currentOver.id,
        overNumber: currentOver.overNumber,
        ballNumber,
        strikerId: nextStrikerId,
        nonStrikerId: nextNonStrikerId,
        bowlerId,
        score: currentInnings.runs + runsOffBat,
        wickets: currentInnings.wickets,
        legalBalls: currentInnings.legalBalls + 1,
        overComplete,
        lastAction:
          runsOffBat === 0
            ? "Dot ball"
            : `${runsOffBat} run${
                runsOffBat !== 1 ? "s" : ""
              }`,
      }),
    });

    return NextResponse.json(
      {
        success: true,
        delivery,
        state: {
          score: currentInnings.runs + runsOffBat,
          wickets: currentInnings.wickets,
          legalBalls:
            currentInnings.legalBalls + 1,
          overNumber: currentOver.overNumber,
          ballNumber,
          strikerId: nextStrikerId,
          nonStrikerId: nextNonStrikerId,
          bowlerId,
          overComplete,
          lastAction:
            runsOffBat === 0
              ? "Dot ball"
              : `${runsOffBat} run${
                  runsOffBat !== 1 ? "s" : ""
                }`,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Delivery API error:", error);

    return NextResponse.json(
      {
        error:
          "Failed to record delivery.",
      },
      { status: 500 }
    );
  }
}