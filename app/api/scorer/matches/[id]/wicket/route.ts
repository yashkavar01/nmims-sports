import { NextRequest, NextResponse } from "next/server";

import db from "../../../../../../lib/db";

type WicketRequest = {
  dismissedPlayerId?: string;
  wicketType?: string;
};

const VALID_WICKET_TYPES = new Set([
  "BOWLED",
  "CAUGHT",
  "LBW",
  "RUN_OUT",
  "STUMPED",
  "HIT_WICKET",
]);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: matchId } = await params;

    const body = (await request.json()) as WicketRequest;

    const dismissedPlayerId =
      body.dismissedPlayerId?.trim();

    const wicketType = body.wicketType?.trim();

    if (!dismissedPlayerId || !wicketType) {
      return NextResponse.json(
        {
          error:
            "Dismissed player and wicket type are required.",
        },
        { status: 400 }
      );
    }

    if (!VALID_WICKET_TYPES.has(wicketType)) {
      return NextResponse.json(
        {
          error: "Invalid wicket type.",
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
          error:
            "Only live matches can receive wickets.",
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

    const dismissedPlayer = matchPlayers.find(
      (player) =>
        player.playerId === dismissedPlayerId &&
        player.role === "PLAYING" &&
        player.teamId ===
          currentInnings.battingTeamId
    );

    if (!dismissedPlayer) {
      return NextResponse.json(
        {
          error:
            "The dismissed player is not part of the batting Playing XI.",
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
)

    const latestInningsState =
      inningsEvents.find(
        (event) =>
          event.type === "INNINGS_STATE"
      );

    let currentStrikerId = "";
    let currentNonStrikerId = "";

    if (latestInningsState?.data) {
      try {
        const state = JSON.parse(
          latestInningsState.data
        ) as {
          strikerId?: string;
          nonStrikerId?: string;
        };

        currentStrikerId =
          state.strikerId ?? "";

        currentNonStrikerId =
          state.nonStrikerId ?? "";
      } catch {
        return NextResponse.json(
          {
            error:
              "Current innings state is invalid.",
          },
          { status: 409 }
        );
      }
    } else {
      const openingEvent =
        inningsEvents.find(
          (event) =>
            event.type ===
            "INNINGS_OPENING_SETUP"
        );

      if (!openingEvent?.data) {
        return NextResponse.json(
          {
            error:
              "Opening setup has not been completed for this innings.",
          },
          { status: 409 }
        );
      }

      try {
        const state = JSON.parse(
          openingEvent.data
        ) as {
          strikerId?: string;
          nonStrikerId?: string;
        };

        currentStrikerId =
          state.strikerId ?? "";

        currentNonStrikerId =
          state.nonStrikerId ?? "";
      } catch {
        return NextResponse.json(
          {
            error:
              "Opening setup state is invalid.",
          },
          { status: 409 }
        );
      }
    }

    if (
      dismissedPlayerId !==
        currentStrikerId &&
      dismissedPlayerId !==
        currentNonStrikerId
    ) {
      return NextResponse.json(
        {
          error:
            "The dismissed player must be the current striker or non-striker.",
        },
        { status: 400 }
      );
    }

    const overs =
      await db.orm.public.CricketOver
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

    const deliveries =
      await db.orm.public.CricketDelivery
        .where({
          overId: currentOver.id,
        })
        .all();

    const legalBallsInOver =
      deliveries.filter(
        (delivery) => delivery.legalBall
      ).length;

    if (legalBallsInOver >= 6) {
      return NextResponse.json(
        {
          error:
            "This over is complete. Start the next over before recording another delivery.",
          overComplete: true,
        },
        { status: 409 }
      );
    }

    const ballNumber =
      deliveries.length + 1;

    const delivery =
      await db.orm.public.CricketDelivery.create({
        inningsId: currentInnings.id,
        overId: currentOver.id,
        ballNumber,
        legalBall: true,
        strikerId:
          currentStrikerId,
        nonStrikerId:
          currentNonStrikerId,
        bowlerId:
          currentOver.bowlerId,
        runsOffBat: 0,
        extras: 0,
        totalRuns: 0,
        extraType: null,
        wicket: true,
        wicketType,
        dismissedPlayerId,
        data: JSON.stringify({
          scorerId: scorer.id,
          deliveryType: "WICKET",
        }),
      });

    const newWickets =
      currentInnings.wickets + 1;

    const inningsComplete =
      newWickets >=
      config.playersPerTeam - 1;

    const newInningsStatus =
      inningsComplete
        ? "COMPLETED"
        : "IN_PROGRESS";

    const newLegalBalls =
      currentInnings.legalBalls + 1;

    await db.orm.public.CricketInnings
      .where({
        id: currentInnings.id,
      })
      .update({
        wickets: newWickets,
        legalBalls: newLegalBalls,
        status: newInningsStatus,
      });

    const overComplete =
      legalBallsInOver + 1 >= 6;

    let nextStrikerId =
      currentStrikerId;

    let nextNonStrikerId =
      currentNonStrikerId;

    if (
      dismissedPlayerId ===
      nextStrikerId
    ) {
      nextStrikerId = "";
    }

    if (
      dismissedPlayerId ===
      nextNonStrikerId
    ) {
      nextNonStrikerId = "";
    }

    if (overComplete) {
      const endOverStriker =
        nextStrikerId;

      nextStrikerId =
        nextNonStrikerId;

      nextNonStrikerId =
        endOverStriker;
    }

    const lastAction =
      `Wicket — ${wicketType.replace(
        "_",
        " "
      )}`;

    await db.orm.public.MatchEvent.create({
      matchId,
      playerId: dismissedPlayerId,
      teamId:
        currentInnings.battingTeamId,
      type: "WICKET",
      data: JSON.stringify({
        inningsId:
          currentInnings.id,
        overId: currentOver.id,
        overNumber:
          currentOver.overNumber,
        ballNumber,
        dismissedPlayerId,
        wicketType,
        score: currentInnings.runs,
        wickets: newWickets,
        legalBalls: newLegalBalls,
        inningsComplete,
        overComplete,
      }),
    });

    await db.orm.public.MatchEvent.create({
      matchId,
      playerId:
        nextStrikerId || null,
      teamId:
        currentInnings.battingTeamId,
      type: "INNINGS_STATE",
      data: JSON.stringify({
        inningsId:
          currentInnings.id,
        overId: currentOver.id,
        overNumber:
          currentOver.overNumber,
        ballNumber,
        strikerId:
          nextStrikerId,
        nonStrikerId:
          nextNonStrikerId,
        bowlerId:
          currentOver.bowlerId,
        score:
          currentInnings.runs,
        wickets: newWickets,
        legalBalls: newLegalBalls,
        overComplete,
        inningsComplete,
        lastAction,
        deliveryType: "WICKET",
        runsOffBat: 0,
        extras: 0,
        totalRuns: 0,
      }),
    });

    return NextResponse.json(
      {
        success: true,
        delivery,
        state: {
          score: currentInnings.runs,
          wickets: newWickets,
          legalBalls: newLegalBalls,
          overNumber:
            currentOver.overNumber,
          ballNumber,
          strikerId:
            nextStrikerId,
          nonStrikerId:
            nextNonStrikerId,
          bowlerId:
            currentOver.bowlerId,
          overComplete,
          inningsComplete,
          newBatsmanRequired:
            !inningsComplete,
          dismissedPlayerId,
          wicketType,
          lastAction,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Wicket API error:", error);

    return NextResponse.json(
      {
        error:
          "Failed to record wicket.",
      },
      { status: 500 }
    );
  }
}