import { NextRequest, NextResponse } from "next/server";

import db from "../../../../../../lib/db";

type StartInningsRequest = {
  strikerId?: string;
  nonStrikerId?: string;
  bowlerId?: string;
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: matchId } = await params;

    const body =
      (await request.json()) as StartInningsRequest;

    const strikerId = body.strikerId?.trim();
    const nonStrikerId = body.nonStrikerId?.trim();
    const bowlerId = body.bowlerId?.trim();

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
            "The match must be LIVE before the innings can be started.",
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

    const inningsList =
      await db.orm.public.CricketInnings
        .where({
          matchId,
        })
        .all();

    if (inningsList.length === 0) {
      return NextResponse.json(
        {
          error:
            "No cricket innings exists for this match. Complete the toss first.",
        },
        { status: 409 }
      );
    }

    const innings = inningsList
      .slice()
      .sort(
        (a, b) =>
          b.inningsNumber -
          a.inningsNumber
      )[0];

    if (!innings) {
      return NextResponse.json(
        {
          error:
            "Current innings could not be found.",
        },
        { status: 409 }
      );
    }

    if (innings.status !== "IN_PROGRESS") {
      return NextResponse.json(
        {
          error:
            "The current innings is not available for opening setup.",
        },
        { status: 409 }
      );
    }

    const existingOpeningEvents =
      await db.orm.public.MatchEvent
        .where({
          matchId,
          type: "INNINGS_OPENING_SETUP",
        })
        .all();

    const existingSetupForInnings =
      existingOpeningEvents.find(
        (event) => {
          if (!event.data) {
            return false;
          }

          try {
            const parsed =
              JSON.parse(event.data) as {
                inningsId?: string;
              };

            return (
              parsed.inningsId ===
              innings.id
            );
          } catch {
            return false;
          }
        }
      );

    if (existingSetupForInnings) {
      return NextResponse.json(
        {
          error:
            "Opening setup has already been completed for this innings.",
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
          player.playerId ===
            strikerId &&
          player.teamId ===
            innings.battingTeamId
      );

    const nonStriker =
      playingPlayers.find(
        (player) =>
          player.playerId ===
            nonStrikerId &&
          player.teamId ===
            innings.battingTeamId
      );

    const bowler =
      playingPlayers.find(
        (player) =>
          player.playerId ===
            bowlerId &&
          player.teamId ===
            innings.bowlingTeamId
      );

    if (!striker) {
      return NextResponse.json(
        {
          error:
            "The selected striker is not part of the confirmed batting Playing XI.",
        },
        { status: 400 }
      );
    }

    if (!nonStriker) {
      return NextResponse.json(
        {
          error:
            "The selected non-striker is not part of the confirmed batting Playing XI.",
        },
        { status: 400 }
      );
    }

    if (!bowler) {
      return NextResponse.json(
        {
          error:
            "The selected bowler is not part of the confirmed bowling Playing XI.",
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
            "Selected bowler was not found.",
        },
        { status: 400 }
      );
    }

    const existingOvers =
      await db.orm.public.CricketOver
        .where({
          inningsId: innings.id,
        })
        .all();

    if (existingOvers.length > 0) {
      return NextResponse.json(
        {
          error:
            "An over has already been created for this innings.",
        },
        { status: 409 }
      );
    }

    const over =
      await db.orm.public.CricketOver.create({
        inningsId: innings.id,
        overNumber: 1,
        bowlerId: player.id,
      });

    const openingState = {
      inningsId: innings.id,
      overId: over.id,
      overNumber: 1,
      ballNumber: 0,
      strikerId,
      nonStrikerId,
      bowlerId,
      score: innings.runs,
      wickets: innings.wickets,
      legalBalls: innings.legalBalls,
      overComplete: false,
      lastAction: "Innings started",
    };

    const event =
      await db.orm.public.MatchEvent.create({
        matchId,
        playerId: strikerId,
        teamId: innings.battingTeamId,
        type: "INNINGS_OPENING_SETUP",
        data: JSON.stringify(
          openingState
        ),
      });

    await db.orm.public.MatchEvent.create({
      matchId,
      playerId: strikerId,
      teamId: innings.battingTeamId,
      type: "INNINGS_STATE",
      data: JSON.stringify(
        openingState
      ),
    });

    return NextResponse.json(
      {
        success: true,
        matchId,
        inningsId: innings.id,
        inningsNumber:
          innings.inningsNumber,
        overId: over.id,
        openingEventId: event.id,
        strikerId,
        nonStrikerId,
        bowlerId,
        state: {
          score: innings.runs,
          wickets: innings.wickets,
          legalBalls:
            innings.legalBalls,
          overNumber: 1,
          ballNumber: 0,
          strikerId,
          nonStrikerId,
          bowlerId,
          overComplete: false,
          lastAction:
            "Innings started",
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Start innings API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to start the innings.",
      },
      { status: 500 }
    );
  }
}