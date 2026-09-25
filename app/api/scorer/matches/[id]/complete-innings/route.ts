import { NextRequest, NextResponse } from "next/server";

import db from "../../../../../../lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: matchId } = await params;

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
            "Only live matches can complete innings.",
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

    if (config.inningsPerTeam !== 1) {
      return NextResponse.json(
        {
          error:
            "The current scorer lifecycle supports one innings per team.",
        },
        { status: 409 }
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

    const allOut =
      currentInnings.wickets >=
      config.playersPerTeam - 1;

    const maxLegalBalls =
      config.overs * 6;

    const oversComplete =
      currentInnings.legalBalls >=
      maxLegalBalls;

    const targetReached =
      currentInnings.target !== null &&
      currentInnings.runs >=
        currentInnings.target;

    const inningsComplete =
      currentInnings.status === "COMPLETED" ||
      allOut ||
      oversComplete ||
      targetReached;

    if (!inningsComplete) {
      return NextResponse.json(
        {
          error:
            "The current innings is not complete yet.",
        },
        { status: 409 }
      );
    }

    if (
      currentInnings.status !==
      "COMPLETED"
    ) {
      await db.orm.public.CricketInnings
        .where({
          id: currentInnings.id,
        })
        .update({
          status: "COMPLETED",
        });
    }

    const completedInnings =
      await db.orm.public.CricketInnings
        .where({
          id: currentInnings.id,
        })
        .first();

    if (!completedInnings) {
      return NextResponse.json(
        {
          error:
            "Completed innings could not be loaded.",
        },
        { status: 500 }
      );
    }

    if (currentInnings.inningsNumber === 1) {
      const existingSecondInnings =
        innings.find(
          (item) =>
            item.inningsNumber === 2
        );

      if (existingSecondInnings) {
        return NextResponse.json(
          {
            error:
              "The second innings has already been created.",
          },
          { status: 409 }
        );
      }

      const secondInnings =
        await db.orm.public.CricketInnings.create({
          matchId,
          inningsNumber: 2,
          battingTeamId:
            currentInnings.bowlingTeamId,
          bowlingTeamId:
            currentInnings.battingTeamId,
          runs: 0,
          wickets: 0,
          legalBalls: 0,
          target:
            completedInnings.runs + 1,
          status: "IN_PROGRESS",
        });

      await db.orm.public.MatchEvent.create({
        matchId,
        teamId:
          completedInnings.battingTeamId,
        type: "INNINGS_COMPLETED",
        data: JSON.stringify({
          inningsId:
            completedInnings.id,
          inningsNumber:
            completedInnings.inningsNumber,
          runs:
            completedInnings.runs,
          wickets:
            completedInnings.wickets,
          legalBalls:
            completedInnings.legalBalls,
          allOut,
          oversComplete,
          targetReached,
        }),
      });

      await db.orm.public.MatchEvent.create({
        matchId,
        teamId:
          secondInnings.battingTeamId,
        type: "INNINGS_STARTED",
        data: JSON.stringify({
          inningsId:
            secondInnings.id,
          inningsNumber: 2,
          battingTeamId:
            secondInnings.battingTeamId,
          bowlingTeamId:
            secondInnings.bowlingTeamId,
          target:
            secondInnings.target,
        }),
      });

      return NextResponse.json(
        {
          success: true,
          action: "SECOND_INNINGS_STARTED",
          innings: secondInnings,
        },
        { status: 201 }
      );
    }

    if (currentInnings.inningsNumber === 2) {
      const firstInnings =
        innings.find(
          (item) =>
            item.inningsNumber === 1
        );

      if (!firstInnings) {
        return NextResponse.json(
          {
            error:
              "First innings could not be found.",
          },
          { status: 409 }
        );
      }

      let winnerTeamId: string | null =
        null;

      let result = "";

      if (targetReached) {
        winnerTeamId =
          currentInnings.battingTeamId;

        const wicketsRemaining =
          Math.max(
            config.playersPerTeam -
              1 -
              currentInnings.wickets,
            0
          );

        result =
          `Won by ${wicketsRemaining} wicket${
            wicketsRemaining !== 1
              ? "s"
              : ""
          }`;
      } else if (
        currentInnings.runs ===
        firstInnings.runs
      ) {
        result = "Match tied";
      } else {
        winnerTeamId =
          firstInnings.battingTeamId;

        const runMargin =
          firstInnings.runs -
          currentInnings.runs;

        result =
          `Won by ${runMargin} run${
            runMargin !== 1
              ? "s"
              : ""
          }`;
      }

      await db.orm.public.Match
        .where({
          id: matchId,
        })
        .update({
          winnerTeamId,
          result,
          status: "COMPLETED",
        });

      await db.orm.public.MatchEvent.create({
        matchId,
        teamId: winnerTeamId,
        type: "MATCH_COMPLETED",
        data: JSON.stringify({
          inningsId:
            currentInnings.id,
          firstInningsId:
            firstInnings.id,
          firstInningsRuns:
            firstInnings.runs,
          secondInningsRuns:
            currentInnings.runs,
          winnerTeamId,
          result,
          allOut,
          oversComplete,
          targetReached,
        }),
      });

      return NextResponse.json(
        {
          success: true,
          action: "MATCH_COMPLETED",
          match: {
            id: matchId,
            winnerTeamId,
            result,
            status: "COMPLETED",
          },
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        error:
          "Unsupported innings number.",
      },
      { status: 409 }
    );
  } catch (error) {
    console.error(
      "Complete innings API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to complete innings.",
      },
      { status: 500 }
    );
  }
}