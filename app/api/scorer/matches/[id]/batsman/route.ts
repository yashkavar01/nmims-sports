import { NextRequest, NextResponse } from "next/server";

import db from "../../../../../../lib/db";

type BatsmanRequest = {
  newBatsmanId?: string;
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
      (await request.json()) as BatsmanRequest;

    const newBatsmanId =
      body.newBatsmanId?.trim();

    if (!newBatsmanId) {
      return NextResponse.json(
        {
          error:
            "New batsman is required.",
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
            "Only live matches can select a new batsman.",
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

    const matchPlayers =
      await db.orm.public.MatchPlayer
        .where({
          matchId,
        })
        .all();

    const newBatsman =
      matchPlayers.find(
        (item) =>
          item.playerId ===
            newBatsmanId &&
          item.teamId ===
            currentInnings.battingTeamId &&
          item.role === "PLAYING"
      );

    if (!newBatsman) {
      return NextResponse.json(
        {
          error:
            "The selected player is not in the batting team's Playing XI.",
        },
        { status: 400 }
      );
    }

    const allEvents =
      await db.orm.public.MatchEvent
        .where({
          matchId,
        })
        .all();

    const stateEvents =
      allEvents
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
              event.type ===
                "INNINGS_STATE" &&
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

    let currentState: InningsStateData;

    try {
      currentState =
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
      currentState.strikerId ?? "";

    const nonStrikerId =
      currentState.nonStrikerId ?? "";

    const bowlerId =
      currentState.bowlerId ?? "";

    if (!bowlerId) {
      return NextResponse.json(
        {
          error:
            "Current bowler could not be determined.",
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

    const dismissedEvents =
      allEvents
        .filter(
          (event) =>
            event.type === "WICKET" &&
            event.data
        )
        .sort(
          (a, b) =>
            b.timestamp.epochMilliseconds -
            a.timestamp.epochMilliseconds
        );

    const dismissedPlayerIds =
      new Set<string>();

    for (
      const event of dismissedEvents
    ) {
      try {
        const data =
          JSON.parse(
            event.data ?? "{}"
          ) as {
            inningsId?: string;
            dismissedPlayerId?: string;
          };

        if (
          data.inningsId ===
            currentInnings.id &&
          data.dismissedPlayerId
        ) {
          dismissedPlayerIds.add(
            data.dismissedPlayerId
          );
        }
      } catch {
        continue;
      }
    }

    if (
      dismissedPlayerIds.has(
        newBatsmanId
      )
    ) {
      return NextResponse.json(
        {
          error:
            "The selected player has already been dismissed.",
        },
        { status: 400 }
      );
    }

    const availablePlayingPlayers =
      matchPlayers.filter(
        (item) =>
          item.teamId ===
            currentInnings.battingTeamId &&
          item.role === "PLAYING"
      );

    if (
      dismissedPlayerIds.size >=
      config.playersPerTeam - 1
    ) {
      return NextResponse.json(
        {
          error:
            "No batting slot is available for another batsman.",
        },
        { status: 409 }
      );
    }

    let nextStrikerId =
      strikerId;

    let nextNonStrikerId =
      nonStrikerId;

    if (!nextStrikerId) {
      nextStrikerId =
        newBatsmanId;
    } else if (!nextNonStrikerId) {
      nextNonStrikerId =
        newBatsmanId;
    } else {
      return NextResponse.json(
        {
          error:
            "There is no empty batting position for the new batsman.",
        },
        { status: 409 }
      );
    }

    if (
      !availablePlayingPlayers.some(
        (item) =>
          item.playerId ===
          nextStrikerId
      ) ||
      !availablePlayingPlayers.some(
        (item) =>
          item.playerId ===
          nextNonStrikerId
      )
    ) {
      return NextResponse.json(
        {
          error:
            "The current batting state contains an invalid player.",
        },
        { status: 409 }
      );
    }

    const overId =
      currentState.overId ?? null;

    const overNumber =
      currentState.overNumber ?? 1;

    const ballNumber =
      currentState.ballNumber ?? 0;

    const score =
      currentState.score ??
      currentInnings.runs;

    const wickets =
      currentState.wickets ??
      currentInnings.wickets;

    const legalBalls =
      currentState.legalBalls ??
      currentInnings.legalBalls;

    const overComplete =
      currentState.overComplete ??
      false;

    const inningsComplete =
      currentState.inningsComplete ??
      false;

    const freeHit =
      currentState.freeHit ??
      false;

    const lastAction =
      "New batsman selected.";

    await db.orm.public.MatchEvent.create({
      matchId,
      playerId: newBatsmanId,
      teamId:
        currentInnings.battingTeamId,
      type: "BATSMAN_REPLACED",
      data: JSON.stringify({
        inningsId:
          currentInnings.id,
        overId,
        overNumber,
        ballNumber,
        strikerId:
          nextStrikerId,
        nonStrikerId:
          nextNonStrikerId,
        bowlerId,
        newBatsmanId,
        score,
        wickets,
        legalBalls,
        freeHit,
      }),
    });

    await db.orm.public.MatchEvent.create({
      matchId,
      playerId:
        nextStrikerId ||
        newBatsmanId,
      teamId:
        currentInnings.battingTeamId,
      type: "INNINGS_STATE",
      data: JSON.stringify({
        inningsId:
          currentInnings.id,
        overId,
        overNumber,
        ballNumber,
        strikerId:
          nextStrikerId,
        nonStrikerId:
          nextNonStrikerId,
        bowlerId,
        score,
        wickets,
        legalBalls,
        overComplete,
        inningsComplete,
        lastAction,
        deliveryType:
          "BATSMAN_REPLACED",
        runsOffBat: 0,
        extras: 0,
        totalRuns: 0,
        freeHit,
      }),
    });

    return NextResponse.json(
      {
        success: true,
        state: {
          score,
          wickets,
          legalBalls,
          overNumber,
          ballNumber,
          strikerId:
            nextStrikerId,
          nonStrikerId:
            nextNonStrikerId,
          bowlerId,
          overComplete,
          inningsComplete,
          lastAction,
          freeHit,
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
        error:
          "Failed to select the new batsman.",
      },
      { status: 500 }
    );
  }
}