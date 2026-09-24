import { NextRequest, NextResponse } from "next/server";

import db from "../../../../../../lib/db";

type NewBatsmanRequest = {
  newBatsmanId?: string;
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: matchId } = await params;

    const body = (await request.json()) as NewBatsmanRequest;

    const newBatsmanId = body.newBatsmanId?.trim();

    if (!newBatsmanId) {
      return NextResponse.json(
        {
          error: "New batsman is required.",
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
          error: "Only live matches can select a new batsman.",
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

    const matchPlayers =
      await db.orm.public.MatchPlayer
        .where({
          matchId,
        })
        .all();

    const newBatsman = matchPlayers.find(
      (player) =>
        player.playerId === newBatsmanId &&
        player.role === "PLAYING" &&
        player.teamId === currentInnings.battingTeamId
    );

    if (!newBatsman) {
      return NextResponse.json(
        {
          error:
            "The selected player is not part of the batting Playing XI.",
        },
        { status: 400 }
      );
    }

    const matchEvents =
      await db.orm.public.MatchEvent
        .where({
          matchId,
        })
        .all();

    const inningsEvents = matchEvents
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
          b.timestamp.epochMilliseconds -
          a.timestamp.epochMilliseconds
      );

    const latestInningsState =
      inningsEvents.find(
        (event) => event.type === "INNINGS_STATE"
      );

    let strikerId = "";
    let nonStrikerId = "";
    let bowlerId = "";
    let overNumber = 1;
    let ballNumber = currentInnings.legalBalls;
    let overComplete = false;
    let lastAction = "New batsman selected.";

    if (latestInningsState?.data) {
      try {
        const state = JSON.parse(
          latestInningsState.data
        ) as {
          strikerId?: string;
          nonStrikerId?: string;
          bowlerId?: string;
          overNumber?: number;
          ballNumber?: number;
          overComplete?: boolean;
        };

        strikerId = state.strikerId ?? "";
        nonStrikerId = state.nonStrikerId ?? "";
        bowlerId = state.bowlerId ?? "";
        overNumber = state.overNumber ?? 1;
        ballNumber =
          state.ballNumber ?? currentInnings.legalBalls;
        overComplete = Boolean(state.overComplete);
      } catch {
        return NextResponse.json(
          {
            error: "Current innings state is invalid.",
          },
          { status: 409 }
        );
      }
    } else {
      return NextResponse.json(
        {
          error:
            "Current innings state is unavailable.",
        },
        { status: 409 }
      );
    }

    if (!strikerId && !nonStrikerId) {
      return NextResponse.json(
        {
          error:
            "No batting position is available for the new batsman.",
        },
        { status: 409 }
      );
    }

    if (
      newBatsmanId === strikerId ||
      newBatsmanId === nonStrikerId
    ) {
      return NextResponse.json(
        {
          error:
            "The selected player is already batting.",
        },
        { status: 400 }
      );
    }

    let replacementPosition:
      | "STRIKER"
      | "NON_STRIKER";

    if (!strikerId) {
      strikerId = newBatsmanId;
      replacementPosition = "STRIKER";
    } else if (!nonStrikerId) {
      nonStrikerId = newBatsmanId;
      replacementPosition = "NON_STRIKER";
    } else {
      return NextResponse.json(
        {
          error:
            "Both batting positions are already occupied.",
        },
        { status: 409 }
      );
    }

    lastAction = `New batsman — ${replacementPosition.toLowerCase().replace("_", " ")}`;

    await db.orm.public.MatchEvent.create({
      matchId,
      playerId: newBatsmanId,
      teamId: currentInnings.battingTeamId,
      type: "BATSMAN_REPLACED",
      data: JSON.stringify({
        inningsId: currentInnings.id,
        newBatsmanId,
        replacementPosition,
        overNumber,
        ballNumber,
      }),
    });

    await db.orm.public.MatchEvent.create({
      matchId,
      playerId: newBatsmanId,
      teamId: currentInnings.battingTeamId,
      type: "INNINGS_STATE",
      data: JSON.stringify({
        inningsId: currentInnings.id,
        overId: null,
        overNumber,
        ballNumber,
        strikerId,
        nonStrikerId,
        bowlerId,
        score: currentInnings.runs,
        wickets: currentInnings.wickets,
        legalBalls: currentInnings.legalBalls,
        overComplete,
        inningsComplete: false,
        lastAction,
        deliveryType: "BATSMAN_REPLACED",
        runsOffBat: 0,
        extras: 0,
        totalRuns: 0,
      }),
    });

    return NextResponse.json(
      {
        success: true,
        state: {
          score: currentInnings.runs,
          wickets: currentInnings.wickets,
          legalBalls: currentInnings.legalBalls,
          overNumber,
          ballNumber,
          strikerId,
          nonStrikerId,
          bowlerId,
          overComplete,
          newBatsmanRequired: false,
          lastAction,
          replacementPosition,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "New batsman API error:",
      error
    );

    return NextResponse.json(
      {
        error: "Failed to select new batsman.",
      },
      { status: 500 }
    );
  }
}