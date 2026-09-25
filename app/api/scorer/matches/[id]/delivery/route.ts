import { NextRequest, NextResponse } from "next/server";

import db from "../../../../../../lib/db";

type DeliveryType =
  | "NORMAL"
  | "WIDE"
  | "NO_BALL"
  | "BYE"
  | "LEG_BYE";

type DeliveryRequest = {
  strikerId?: string;
  nonStrikerId?: string;
  bowlerId?: string;
  deliveryType?: DeliveryType;
  runsOffBat?: number;
};

const VALID_RUNS = new Set([0, 1, 2, 3, 4, 6]);

const VALID_DELIVERY_TYPES = new Set<DeliveryType>([
  "NORMAL",
  "WIDE",
  "NO_BALL",
  "BYE",
  "LEG_BYE",
]);

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

    const deliveryType: DeliveryType =
      body.deliveryType ?? "NORMAL";

    const runsOffBat =
      typeof body.runsOffBat === "number"
        ? body.runsOffBat
        : 0;

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

    if (!VALID_DELIVERY_TYPES.has(deliveryType)) {
      return NextResponse.json(
        {
          error: "Invalid delivery type.",
        },
        { status: 400 }
      );
    }

    if (
      deliveryType === "NORMAL" &&
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

    if (
      deliveryType !== "NORMAL" &&
      runsOffBat !== 0
    ) {
      return NextResponse.json(
        {
          error:
            "Runs off bat must be 0 for an extras delivery.",
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

    if (!scorer || scorer.role !== "SCORER") {
      return NextResponse.json(
        {
          error: "Scorer account not found.",
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
            "Only live matches can receive deliveries.",
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
      (a, b) =>
        b.inningsNumber -
        a.inningsNumber
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

    if (
      currentInnings.target !== null &&
      currentInnings.runs >= currentInnings.target
    ) {
      return NextResponse.json(
        {
          error:
            "The target has already been reached. The match is complete.",
          matchCompleted: true,
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

    const maxLegalBalls =
      config.overs * 6;

    if (
      currentInnings.legalBalls >=
      maxLegalBalls
    ) {
      return NextResponse.json(
        {
          error:
            "The maximum number of overs has been completed. End the innings before recording another delivery.",
          inningsComplete: true,
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

    const inningsOpeningEvents =
      openingEvents
        .filter((event) => {
          if (!event.data) {
            return false;
          }

          try {
            const data = JSON.parse(
              event.data
            ) as {
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
        );

    if (
      inningsOpeningEvents.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "Opening setup has not been completed for this innings.",
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

    const currentOver = [...overs].sort(
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

    const legalDeliveriesInOver =
      deliveries.filter(
        (delivery) => delivery.legalBall
      );

    if (legalDeliveriesInOver.length >= 6) {
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

    const playingPlayers =
      matchPlayers.filter(
        (player) =>
          player.role === "PLAYING"
      );

    const striker =
      playingPlayers.find(
        (player) =>
          player.playerId === strikerId &&
          player.teamId ===
            currentInnings.battingTeamId
      );

    const nonStriker =
      playingPlayers.find(
        (player) =>
          player.playerId ===
            nonStrikerId &&
          player.teamId ===
            currentInnings.battingTeamId
      );

    const bowler =
      playingPlayers.find(
        (player) =>
          player.playerId === bowlerId &&
          player.teamId ===
            currentInnings.bowlingTeamId
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

    const player =
      await db.orm.public.Player
        .where({
          id: bowlerId,
        })
        .first();

    if (!player) {
      return NextResponse.json(
        {
          error:
            "Bowler player record not found.",
        },
        { status: 400 }
      );
    }

    const ballNumber =
      deliveries.length + 1;

    const legalBall =
      deliveryType === "WIDE" ||
      deliveryType === "NO_BALL"
        ? false
        : true;

    const extras =
      deliveryType === "WIDE" ||
      deliveryType === "NO_BALL" ||
      deliveryType === "BYE" ||
      deliveryType === "LEG_BYE"
        ? 1
        : 0;

    const totalRuns =
      runsOffBat + extras;

    const delivery =
      await db.orm.public.CricketDelivery.create({
        inningsId:
          currentInnings.id,
        overId: currentOver.id,
        ballNumber,
        legalBall,
        strikerId,
        nonStrikerId,
        bowlerId,
        runsOffBat,
        extras,
        totalRuns,
        extraType:
          deliveryType === "NORMAL"
            ? null
            : deliveryType,
        wicket: false,
        wicketType: null,
        dismissedPlayerId: null,
        data: JSON.stringify({
          scorerId: scorer.id,
          deliveryType,
        }),
      });

    const nextRuns =
      currentInnings.runs +
      totalRuns;

    const nextLegalBalls =
      currentInnings.legalBalls +
      (legalBall ? 1 : 0);

    const targetReached =
      currentInnings.target !== null &&
      nextRuns >=
        currentInnings.target;

    const maximumOversReached =
      nextLegalBalls >=
      maxLegalBalls;

    await db.orm.public.CricketInnings
      .where({
        id: currentInnings.id,
      })
      .update({
        runs: nextRuns,
        legalBalls:
          nextLegalBalls,
        status:
          targetReached ||
          maximumOversReached
            ? "COMPLETED"
            : "IN_PROGRESS",
      });

    let nextStrikerId = strikerId;
    let nextNonStrikerId =
      nonStrikerId;

    const runsForRotation =
      deliveryType === "NORMAL"
        ? runsOffBat
        : deliveryType === "BYE" ||
            deliveryType ===
              "LEG_BYE"
          ? extras
          : 0;

    if (
      runsForRotation % 2 ===
      1
    ) {
      nextStrikerId =
        nonStrikerId;
      nextNonStrikerId =
        strikerId;
    }

    const overComplete =
      legalBall &&
      legalDeliveriesInOver.length +
        1 ===
        6;

    if (overComplete) {
      const endOverStriker =
        nextStrikerId;

      nextStrikerId =
        nextNonStrikerId;

      nextNonStrikerId =
        endOverStriker;
    }

    let lastAction =
      "Dot ball";

    if (
      deliveryType ===
      "NORMAL"
    ) {
      lastAction =
        runsOffBat === 0
          ? "Dot ball"
          : `${runsOffBat} run${
              runsOffBat !== 1
                ? "s"
                : ""
            }`;
    } else if (
      deliveryType ===
      "WIDE"
    ) {
      lastAction = "Wide +1";
    } else if (
      deliveryType ===
      "NO_BALL"
    ) {
      lastAction =
        "No Ball +1";
    } else if (
      deliveryType ===
      "BYE"
    ) {
      lastAction =
        "Bye +1";
    } else if (
      deliveryType ===
      "LEG_BYE"
    ) {
      lastAction =
        "Leg Bye +1";
    }

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
          currentOver.id,
        overNumber:
          currentOver.overNumber,
        ballNumber,
        strikerId:
          nextStrikerId,
        nonStrikerId:
          nextNonStrikerId,
        bowlerId,
        score: nextRuns,
        wickets:
          currentInnings.wickets,
        legalBalls:
          nextLegalBalls,
        overComplete:
          targetReached ||
          maximumOversReached
            ? false
            : overComplete,
        lastAction,
        deliveryType,
        runsOffBat,
        extras,
        totalRuns,
      }),
    });

    if (
      targetReached &&
      currentInnings.inningsNumber ===
        2
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
          wicketsRemaining !== 1
            ? "s"
            : ""
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

      await db.orm.public.MatchEvent.create({
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
            nextRuns,
          winnerTeamId:
            currentInnings.battingTeamId,
          result,
          reason:
            "TARGET_REACHED",
        }),
      });

      return NextResponse.json(
        {
          success: true,
          matchCompleted: true,
          result,
          delivery,
          state: {
            score: nextRuns,
            wickets:
              currentInnings.wickets,
            legalBalls:
              nextLegalBalls,
            overNumber:
              currentOver.overNumber,
            ballNumber,
            strikerId:
              nextStrikerId,
            nonStrikerId:
              nextNonStrikerId,
            bowlerId,
            overComplete:
              false,
            lastAction:
              "Target reached.",
            deliveryType,
            runsOffBat,
            extras,
            totalRuns,
          },
        },
        { status: 201 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        delivery,
        matchCompleted: false,
        inningsComplete:
          maximumOversReached,
        state: {
          score: nextRuns,
          wickets:
            currentInnings.wickets,
          legalBalls:
            nextLegalBalls,
          overNumber:
            currentOver.overNumber,
          ballNumber,
          strikerId:
            nextStrikerId,
          nonStrikerId:
            nextNonStrikerId,
          bowlerId,
          overComplete:
            maximumOversReached
              ? true
              : overComplete,
          lastAction,
          deliveryType,
          runsOffBat,
          extras,
          totalRuns,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Delivery API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to record delivery.",
      },
      { status: 500 }
    );
  }
}