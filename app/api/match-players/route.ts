import { NextResponse } from "next/server";
import db from "../../../lib/db";

type SquadPlayerInput = {
  playerId: string;
  teamId: string;
  role: "PLAYING" | "SUBSTITUTE";
  position?: number | null;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const matchId = searchParams.get("matchId");

    if (!matchId) {
      return NextResponse.json(
        { error: "Match ID is required." },
        { status: 400 }
      );
    }

    const matchPlayers =
      await db.orm.public.MatchPlayer
        .where({ matchId })
        .all();

    return NextResponse.json(matchPlayers);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Failed to fetch match squad." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const matchId = body.matchId?.trim();
    const players = body.players as
      | SquadPlayerInput[]
      | undefined;

    if (!matchId) {
      return NextResponse.json(
        { error: "Match ID is required." },
        { status: 400 }
      );
    }

    if (!Array.isArray(players)) {
      return NextResponse.json(
        { error: "Players must be provided as an array." },
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

    if (!sport) {
      return NextResponse.json(
        { error: "Sport not found." },
        { status: 404 }
      );
    }

    if (
      sport.name.trim().toLowerCase() !==
      "cricket"
    ) {
      return NextResponse.json(
        {
          error:
            "Match squad configuration is currently available for cricket matches only.",
        },
        { status: 400 }
      );
    }

    const cricketConfig =
      await db.orm.public.CricketMatchConfig
        .where({ matchId })
        .first();

    if (!cricketConfig) {
      return NextResponse.json(
        {
          error:
            "Cricket match configuration was not found.",
        },
        { status: 400 }
      );
    }

    const validTeamIds = [
      match.homeTeamId,
      match.awayTeamId,
    ];

    const invalidTeam = players.find(
      (player) =>
        !validTeamIds.includes(player.teamId)
    );

    if (invalidTeam) {
      return NextResponse.json(
        {
          error:
            "Every squad player must belong to one of the teams in this match.",
        },
        { status: 400 }
      );
    }

    const invalidRole = players.find(
      (player) =>
        player.role !== "PLAYING" &&
        player.role !== "SUBSTITUTE"
    );

    if (invalidRole) {
      return NextResponse.json(
        {
          error:
            "Invalid squad player role.",
        },
        { status: 400 }
      );
    }

    const duplicatePlayers = new Set<string>();

    for (const player of players) {
      if (duplicatePlayers.has(player.playerId)) {
        return NextResponse.json(
          {
            error:
              "A player cannot be selected more than once.",
          },
          { status: 400 }
        );
      }

      duplicatePlayers.add(player.playerId);
    }

    const playerIds = players.map(
      (player) => player.playerId
    );

    const officialPlayers =
      await db.orm.public.Player.all();

    const officialPlayerMap = new Map(
      officialPlayers.map((player) => [
        player.id,
        player,
      ])
    );

    for (const squadPlayer of players) {
      const player = officialPlayerMap.get(
        squadPlayer.playerId
      );

      if (!player) {
        return NextResponse.json(
          {
            error:
              "One or more selected players do not exist.",
          },
          { status: 404 }
        );
      }

      if (
        player.teamId !== squadPlayer.teamId
      ) {
        return NextResponse.json(
          {
            error:
              "A selected player does not belong to the selected team.",
          },
          { status: 400 }
        );
      }
    }

    const teamSquads = [
      {
        teamId: match.homeTeamId,
        name: "Team A",
      },
      {
        teamId: match.awayTeamId,
        name: "Team B",
      },
    ];

    for (const team of teamSquads) {
      const teamPlayers = players.filter(
        (player) =>
          player.teamId === team.teamId
      );

      const playingPlayers =
        teamPlayers.filter(
          (player) =>
            player.role === "PLAYING"
        );

      const substitutes =
        teamPlayers.filter(
          (player) =>
            player.role === "SUBSTITUTE"
        );

      if (
        playingPlayers.length >
        cricketConfig.playersPerTeam
      ) {
        return NextResponse.json(
          {
            error: `${team.name} cannot have more than ${cricketConfig.playersPerTeam} playing players.`,
          },
          { status: 400 }
        );
      }

      if (
        substitutes.length >
        cricketConfig.substitutesPerTeam
      ) {
        return NextResponse.json(
          {
            error: `${team.name} cannot have more than ${cricketConfig.substitutesPerTeam} substitutes.`,
          },
          { status: 400 }
        );
      }

      const positions = playingPlayers.map(
        (player) => player.position
      );

      if (
        positions.some(
          (position) =>
            !Number.isInteger(position) ||
            (position as number) <= 0
        )
      ) {
        return NextResponse.json(
          {
            error: `${team.name} playing players must have valid positions.`,
          },
          { status: 400 }
        );
      }

      const uniquePositions =
        new Set(positions);

      if (
        uniquePositions.size !==
        positions.length
      ) {
        return NextResponse.json(
          {
            error: `${team.name} cannot have duplicate playing positions.`,
          },
          { status: 400 }
        );
      }

      const sortedPositions = [
        ...positions,
      ].sort(
        (a, b) =>
          (a as number) - (b as number)
      );

      for (
        let index = 0;
        index < sortedPositions.length;
        index++
      ) {
        if (
          sortedPositions[index] !==
          index + 1
        ) {
          return NextResponse.json(
            {
              error: `${team.name} playing positions must start from 1 and be continuous.`,
            },
            { status: 400 }
          );
        }
      }
    }

    for (const player of players) {
      if (
        player.role === "SUBSTITUTE" &&
        player.position !== null &&
        player.position !== undefined
      ) {
        return NextResponse.json(
          {
            error:
              "Substitute players cannot have a playing position.",
          },
          { status: 400 }
        );
      }
    }

    const existingPlayers =
      await db.orm.public.MatchPlayer
        .where({ matchId })
        .all();

    for (const existingPlayer of existingPlayers) {
      await db.orm.public.MatchPlayer
        .where({
          id: existingPlayer.id,
        })
        .delete();
    }

    for (const player of players) {
      await db.orm.public.MatchPlayer.create({
        matchId,
        playerId: player.playerId,
        teamId: player.teamId,
        role: player.role,
        position:
          player.role === "PLAYING"
            ? player.position ?? null
            : null,
      });
    }

    const savedPlayers =
      await db.orm.public.MatchPlayer
        .where({ matchId })
        .all();

    return NextResponse.json(
      {
        success: true,
        players: savedPlayers,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          "Failed to save match squad.",
      },
      { status: 500 }
    );
  }
}