import { NextRequest, NextResponse } from "next/server";

import db from "../../../../../../lib/db";

type WicketRequest = {
  dismissedPlayerId?: string;
  wicketType?: string;
  runsOffBat?: number;
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
  freeHit?: boolean;
};

const VALID_WICKET_TYPES = new Set([
  "BOWLED",
  "CAUGHT",
  "LBW",
  "RUN_OUT",
  "STUMPED",
  "HIT_WICKET",
]);

const VALID_RUN_OUT_RUNS = new Set([
  0,
  1,
  2,
  3,
  4,
  6,
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

    const wicketType =
      body.wicketType?.trim();

    const runsOffBat =
      typeof body.runsOffBat === "number"
        ? body.runsOffBat
        : 0;

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

    if (
      !Number.isInteger(runsOffBat) ||
      runsOffBat < 0
    ) {
      return NextResponse.json(
        {
          error:
            "Runs off bat must be a non-negative integer.",
        },
        { status: 400 }
      );
    }

    if (
      wicketType !== "RUN_OUT" &&
      runsOffBat !== 0
    ) {
      return NextResponse.json(
        {
          error:
            "Only a run-out can be recorded with runs on the same delivery.",
        },
        { status: 400 }
      );
    }

    if (
      wicketType === "RUN_OUT" &&
      !VALID_RUN_OUT_RUNS.has(runsOffBat)
    ) {
      return NextResponse.json(
        {
          error:
            "Run-out runs must be 0, 1, 2, 3, 4 or 6.",
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
      (
        assignment.status !== "ASSIGNED" &&
        assignment.status !== "ACTIVE"
      )
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

    const currentInnings =
      [...innings].sort(
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

    const dismissedPlayer =
      matchPlayers.find(
        (player) =>
          player.playerId ===
            dismissedPlayerId &&
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

    const inningsEvents =
      matchEvents
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

    const latestInningsState =
      inningsEvents.find(
        (event) =>
          event.type ===
          "INNINGS_STATE"
      );

    let currentStrikerId = "";
    let currentNonStrikerId = "";
    let currentBowlerId = "";
    let freeHit = false;

    if (latestInningsState?.data) {
      try {
        const state =
          JSON.parse(
            latestInningsState.data
          ) as InningsStateData;

        currentStrikerId =
          state.strikerId ?? "";

        currentNonStrikerId =
          state.nonStrikerId ?? "";

        currentBowlerId =
          state.bowlerId ?? "";

        freeHit =
          state.freeHit ?? false;
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
        const state =
          JSON.parse(
            openingEvent.data
          ) as InningsStateData;

        currentStrikerId =
          state.strikerId ?? "";

        currentNonStrikerId =
          state.nonStrikerId ?? "";

        currentBowlerId =
          state.bowlerId ?? "";

        freeHit = false;
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

    if (!currentBowlerId) {
      return NextResponse.json(
        {
          error:
            "Current bowler could not be determined.",
        },
        { status: 409 }
      );
    }

    if (
      freeHit &&
      wicketType !== "RUN_OUT"
    ) {
      return NextResponse.json(
        {
          error:
            "Free Hit allows only RUN OUT.",
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
            "No over has been created for the current innings.",
        },
        { status: 409 }
      );
    }

    const currentOver =
      [...overs].sort(
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

    const legalBallsInOver =
      deliveries.filter(
        (delivery) =>
          delivery.legalBall
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

    const totalRuns =
      runsOffBat;

    const newRuns =
      currentInnings.runs +
      totalRuns;

    const newWickets =
      currentInnings.wickets +
      1;

    const newLegalBalls =
      currentInnings.legalBalls +
      1;

    const allOut =
      newWickets >=
      config.playersPerTeam - 1;

    const maximumOversReached =
      newLegalBalls >=
      config.overs * 6;

    const targetReached =
      currentInnings.target !== null &&
      newRuns >=
        currentInnings.target;

    const inningsComplete =
      allOut ||
      maximumOversReached ||
      targetReached;

    const overComplete =
      legalBallsInOver + 1 >= 6;

    const delivery =
      await db.orm.public.CricketDelivery.create(
        {
          inningsId:
            currentInnings.id,
          overId:
            currentOver.id,
          ballNumber,
          legalBall: true,
          strikerId:
            currentStrikerId,
          nonStrikerId:
            currentNonStrikerId,
          bowlerId:
            currentOver.bowlerId,
          runsOffBat,
          extras: 0,
          totalRuns,
          extraType: null,
          wicket: true,
          wicketType,
          dismissedPlayerId,
          data: JSON.stringify({
            scorerId:
              scorer.id,
            deliveryType:
              "WICKET",
            freeHit,
          }),
        }
      );

    await db.orm.public.CricketInnings
      .where({
        id: currentInnings.id,
      })
      .update({
        runs: newRuns,
        wickets: newWickets,
        legalBalls:
          newLegalBalls,
        status:
          inningsComplete
            ? "COMPLETED"
            : "IN_PROGRESS",
      });

    let nextStrikerId =
      currentStrikerId;

    let nextNonStrikerId =
      currentNonStrikerId;

    if (
      runsOffBat % 2 ===
      1
    ) {
      const rotatedStriker =
        nextStrikerId;

      nextStrikerId =
        nextNonStrikerId;

      nextNonStrikerId =
        rotatedStriker;
    }

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

    if (
      overComplete &&
      !inningsComplete
    ) {
      const endOverStriker =
        nextStrikerId;

      nextStrikerId =
        nextNonStrikerId;

      nextNonStrikerId =
        endOverStriker;
    }

    const newBatsmanRequired =
      !inningsComplete &&
      (
        !nextStrikerId ||
        !nextNonStrikerId
      );

    const lastAction =
      runsOffBat > 0
        ? `Wicket — ${wicketType.replace(
            "_",
            " "
          )} + ${runsOffBat} run${
            runsOffBat === 1
              ? ""
              : "s"
          }`
        : `Wicket — ${wicketType.replace(
            "_",
            " "
          )}`;

    await db.orm.public.MatchEvent.create(
      {
        matchId,
        playerId:
          dismissedPlayerId,
        teamId:
          currentInnings.battingTeamId,
        type: "WICKET",
        data: JSON.stringify({
          inningsId:
            currentInnings.id,
          overId:
            currentOver.id,
          overNumber:
            currentOver.overNumber,
          ballNumber,
          dismissedPlayerId,
          wicketType,
          runsOffBat,
          extras: 0,
          totalRuns,
          score: newRuns,
          wickets:
            newWickets,
          legalBalls:
            newLegalBalls,
          inningsComplete,
          overComplete,
          newBatsmanRequired,
          freeHit,
        }),
      }
    );

    await db.orm.public.MatchEvent.create(
      {
        matchId,
        playerId:
          nextStrikerId ||
          null,
        teamId:
          currentInnings.battingTeamId,
        type: "INNINGS_STATE",
        data: JSON.stringify({
          inningsId:
            currentInnings.id,
          overId:
            currentOver.id,
          overNumber:
            currentOver.overNumber,
          ballNumber,
          strikerId:
            nextStrikerId,
          nonStrikerId:
            nextNonStrikerId,
          bowlerId:
            currentOver.bowlerId,
          score: newRuns,
          wickets:
            newWickets,
          legalBalls:
            newLegalBalls,
          overComplete,
          inningsComplete,
          newBatsmanRequired,
          lastAction,
          deliveryType:
            "WICKET",
          runsOffBat,
          extras: 0,
          totalRuns,
          freeHit: false,
        }),
      }
    );

    if (
      targetReached &&
      currentInnings.inningsNumber === 2
    ) {
      const firstInnings =
        innings.find(
          (item) =>
            item.inningsNumber ===
            1
        );

      if (!firstInnings) {
        return NextResponse.json(
          {
            error:
              "First innings could not be found.",
          },
          { status: 500 }
        );
      }

      const wicketsRemaining =
        Math.max(
          config.playersPerTeam -
            1 -
            currentInnings.wickets,
          0
        );

      const result =
        `Won by ${wicketsRemaining} wicket${
          wicketsRemaining === 1
            ? ""
            : "s"
        }`;

      await db.orm.public.Match
        .where({
          id: matchId,
        })
        .update({
          winnerTeamId:
            currentInnings.battingTeamId,
          result,
          status:
            "COMPLETED",
        });

      await db.orm.public.MatchEvent.create(
        {
          matchId,
          teamId:
            currentInnings.battingTeamId,
          type:
            "MATCH_COMPLETED",
          data: JSON.stringify({
            inningsId:
              currentInnings.id,
            firstInningsId:
              firstInnings.id,
            firstInningsRuns:
              firstInnings.runs,
            secondInningsRuns:
              newRuns,
            winnerTeamId:
              currentInnings.battingTeamId,
            result,
            reason:
              "TARGET_REACHED",
          }),
        }
      );

      return NextResponse.json(
        {
          success: true,
          matchCompleted:
            true,
          result,
          delivery,
          state: {
            score: newRuns,
            wickets:
              newWickets,
            legalBalls:
              newLegalBalls,
            overNumber:
              currentOver.overNumber,
            ballNumber,
            strikerId:
              nextStrikerId,
            nonStrikerId:
              nextNonStrikerId,
            bowlerId:
              currentOver.bowlerId,
            overComplete:
              false,
            inningsComplete:
              true,
            newBatsmanRequired:
              false,
            lastAction:
              result,
            runsOffBat,
            extras: 0,
            totalRuns,
            freeHit: false,
          },
        },
        { status: 201 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        matchCompleted:
          false,
        inningsComplete,
        delivery,
        state: {
          score: newRuns,
          wickets:
            newWickets,
          legalBalls:
            newLegalBalls,
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
          newBatsmanRequired,
          dismissedPlayerId,
          wicketType,
          lastAction,
          runsOffBat,
          extras: 0,
          totalRuns,
          freeHit: false,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Wicket API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to record wicket.",
      },
      { status: 500 }
    );
  }
}