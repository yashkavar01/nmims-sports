import { NextRequest, NextResponse } from "next/server";
import db from "../../../../../lib/db";

type TossRequest = {
  tossWinnerTeamId?: string;
  tossDecision?: string;
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: matchId } = await params;
    const body = (await request.json()) as TossRequest;

    const tossWinnerTeamId = body.tossWinnerTeamId?.trim();
    const tossDecision = body.tossDecision?.trim().toUpperCase();

    if (!tossWinnerTeamId) {
      return NextResponse.json(
        { error: "Toss winner is required." },
        { status: 400 }
      );
    }

    if (tossDecision !== "BAT" && tossDecision !== "BOWL") {
      return NextResponse.json(
        { error: "Toss decision must be BAT or BOWL." },
        { status: 400 }
      );
    }

    const match = await db.orm.public.Match
      .where({ id: matchId })
      .first();

    if (!match) {
      return NextResponse.json(
        { error: "Match not found." },
        { status: 404 }
      );
    }

    const sport = await db.orm.public.Sport
      .where({ id: match.sportId })
      .first();

    if (!sport || sport.name.trim().toLowerCase() !== "cricket") {
      return NextResponse.json(
        { error: "Toss workflow is currently available only for cricket." },
        { status: 400 }
      );
    }

    if (match.status === "LIVE" || match.status === "COMPLETED") {
      return NextResponse.json(
        { error: "Toss cannot be changed after the match has started." },
        { status: 409 }
      );
    }

    const innings = await db.orm.public.CricketInnings
      .where({ matchId })
      .all();

    if (innings.length > 0) {
      return NextResponse.json(
        { error: "Toss cannot be changed after innings have started." },
        { status: 409 }
      );
    }

    const isHomeTeam = tossWinnerTeamId === match.homeTeamId;
    const isAwayTeam = tossWinnerTeamId === match.awayTeamId;

    if (!isHomeTeam && !isAwayTeam) {
      return NextResponse.json(
        { error: "Toss winner must be one of the teams in this match." },
        { status: 400 }
      );
    }

    const config = await db.orm.public.CricketMatchConfig
      .where({ matchId })
      .first();

    if (!config) {
      return NextResponse.json(
        { error: "Cricket match configuration is missing." },
        { status: 400 }
      );
    }

    const matchPlayers = await db.orm.public.MatchPlayer
      .where({ matchId })
      .all();

    const playingPlayers = matchPlayers.filter(
      (player) => player.role === "PLAYING"
    );

    const homePlayingCount = playingPlayers.filter(
      (player) => player.teamId === match.homeTeamId
    ).length;

    const awayPlayingCount = playingPlayers.filter(
      (player) => player.teamId === match.awayTeamId
    ).length;

    if (
      homePlayingCount !== config.playersPerTeam ||
      awayPlayingCount !== config.playersPerTeam
    ) {
      return NextResponse.json(
        {
          error: `Both teams must have exactly ${config.playersPerTeam} playing players before the match can start.`,
        },
        { status: 400 }
      );
    }

    const battingTeamId =
      tossDecision === "BAT"
        ? tossWinnerTeamId
        : isHomeTeam
          ? match.awayTeamId
          : match.homeTeamId;

    const bowlingTeamId =
      battingTeamId === match.homeTeamId
        ? match.awayTeamId
        : match.homeTeamId;

    await db.orm.public.Match
      .where({ id: matchId })
      .update({
        tossWinnerTeamId,
        tossDecision,
        status: "LIVE",
      });

    const firstInnings = await db.orm.public.CricketInnings.create({
      matchId,
      inningsNumber: 1,
      battingTeamId,
      bowlingTeamId,
      runs: 0,
      wickets: 0,
      legalBalls: 0,
      target: null,
      status: "IN_PROGRESS",
    });

    return NextResponse.json(
      {
        success: true,
        matchId,
        tossWinnerTeamId,
        tossDecision,
        battingTeamId,
        bowlingTeamId,
        innings: firstInnings,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Toss API error:", error);

    return NextResponse.json(
      { error: "Failed to save toss and start innings." },
      { status: 500 }
    );
  }
}