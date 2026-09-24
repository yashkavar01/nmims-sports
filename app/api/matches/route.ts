import { NextResponse } from "next/server";
import { Temporal } from "temporal-polyfill/full";
import db from "../../../lib/db";

export async function GET() {
  try {
    const matches = await db.orm.public.Match.all();

    return NextResponse.json(matches);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Failed to fetch matches." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      sportId,
      tournamentId,
      homeTeamId,
      awayTeamId,
      scheduledAt,
      venue,
      round,
      matchNumber,
      cricketConfig,
    } = body;

    if (
      !sportId ||
      !tournamentId ||
      !homeTeamId ||
      !awayTeamId
    ) {
      return NextResponse.json(
        {
          error:
            "Sport, tournament, and both teams are required.",
        },
        { status: 400 }
      );
    }

    if (homeTeamId === awayTeamId) {
      return NextResponse.json(
        {
          error:
            "A team cannot play against itself.",
        },
        { status: 400 }
      );
    }

    const sport = await db.orm.public.Sport
      .where({ id: sportId })
      .first();

    if (!sport) {
      return NextResponse.json(
        { error: "Sport not found." },
        { status: 404 }
      );
    }

    const tournament =
      await db.orm.public.Tournament
        .where({ id: tournamentId })
        .first();

    if (!tournament) {
      return NextResponse.json(
        { error: "Tournament not found." },
        { status: 404 }
      );
    }

    if (tournament.sportId !== sportId) {
      return NextResponse.json(
        {
          error:
            "Tournament does not belong to the selected sport.",
        },
        { status: 400 }
      );
    }

    const homeTeam = await db.orm.public.Team
      .where({ id: homeTeamId })
      .first();

    const awayTeam = await db.orm.public.Team
      .where({ id: awayTeamId })
      .first();

    if (!homeTeam || !awayTeam) {
      return NextResponse.json(
        {
          error:
            "One or both teams were not found.",
        },
        { status: 404 }
      );
    }

    if (
      homeTeam.sportId !== sportId ||
      awayTeam.sportId !== sportId
    ) {
      return NextResponse.json(
        {
          error:
            "Both teams must belong to the selected sport.",
        },
        { status: 400 }
      );
    }

    const homeRegistration =
      await db.orm.public.TournamentTeam
        .where({
          tournamentId,
          teamId: homeTeamId,
        })
        .first();

    const awayRegistration =
      await db.orm.public.TournamentTeam
        .where({
          tournamentId,
          teamId: awayTeamId,
        })
        .first();

    if (
      !homeRegistration ||
      !awayRegistration
    ) {
      return NextResponse.json(
        {
          error:
            "Both teams must be officially registered in this tournament.",
        },
        { status: 400 }
      );
    }

    const isCricket =
      sport.name.trim().toLowerCase() ===
      "cricket";

    if (isCricket && !cricketConfig) {
      return NextResponse.json(
        {
          error:
            "Cricket match configuration is required.",
        },
        { status: 400 }
      );
    }

    if (!isCricket && cricketConfig) {
      return NextResponse.json(
        {
          error:
            "Cricket configuration can only be used for cricket matches.",
        },
        { status: 400 }
      );
    }

    let scheduledInstant = null;

    if (scheduledAt) {
      try {
        scheduledInstant =
          Temporal.Instant.from(scheduledAt);
      } catch {
        return NextResponse.json(
          {
            error:
              "Invalid scheduled date and time.",
          },
          { status: 400 }
        );
      }
    }

    let parsedMatchNumber = null;

    if (
      matchNumber !== "" &&
      matchNumber !== null &&
      matchNumber !== undefined
    ) {
      parsedMatchNumber = Number(matchNumber);

      if (
        !Number.isInteger(parsedMatchNumber) ||
        parsedMatchNumber <= 0
      ) {
        return NextResponse.json(
          {
            error:
              "Match number must be a positive whole number.",
          },
          { status: 400 }
        );
      }
    }

    let validatedCricketConfig = null;

    if (isCricket) {
      const overs = Number(
        cricketConfig.overs
      );

      const playersPerTeam = Number(
        cricketConfig.playersPerTeam
      );

      const substitutesPerTeam = Number(
        cricketConfig.substitutesPerTeam
      );

      const inningsPerTeam = Number(
        cricketConfig.inningsPerTeam
      );

      const validFormats = [
        "T10",
        "T20",
        "T50",
        "CUSTOM",
      ];

      const format =
        typeof cricketConfig.format ===
        "string"
          ? cricketConfig.format
              .trim()
              .toUpperCase()
          : "";

      if (!validFormats.includes(format)) {
        return NextResponse.json(
          {
            error:
              "Invalid cricket match format.",
          },
          { status: 400 }
        );
      }

      if (
        !Number.isInteger(overs) ||
        overs <= 0
      ) {
        return NextResponse.json(
          {
            error:
              "Cricket overs must be a positive whole number.",
          },
          { status: 400 }
        );
      }

      if (
        !Number.isInteger(playersPerTeam) ||
        playersPerTeam <= 0
      ) {
        return NextResponse.json(
          {
            error:
              "Players per team must be a positive whole number.",
          },
          { status: 400 }
        );
      }

      if (
        !Number.isInteger(
          substitutesPerTeam
        ) ||
        substitutesPerTeam < 0
      ) {
        return NextResponse.json(
          {
            error:
              "Substitutes per team cannot be negative.",
          },
          { status: 400 }
        );
      }

      if (
        !Number.isInteger(inningsPerTeam) ||
        inningsPerTeam <= 0
      ) {
        return NextResponse.json(
          {
            error:
              "Innings per team must be a positive whole number.",
          },
          { status: 400 }
        );
      }

      validatedCricketConfig = {
        format,
        overs,
        playersPerTeam,
        substitutesPerTeam,
        inningsPerTeam,
        wideEnabled:
          cricketConfig.wideEnabled === true,
        noBallEnabled:
          cricketConfig.noBallEnabled === true,
        byeEnabled:
          cricketConfig.byeEnabled === true,
        legByeEnabled:
          cricketConfig.legByeEnabled === true,
        penaltyRunsEnabled:
          cricketConfig.penaltyRunsEnabled ===
          true,
      };
    }

    const match =
      await db.orm.public.Match.create({
        sportId,
        tournamentId,
        homeTeamId,
        awayTeamId,
        scheduledAt: scheduledInstant,
        venue:
          typeof venue === "string"
            ? venue.trim() || null
            : null,
        round:
          typeof round === "string"
            ? round.trim() || null
            : null,
        matchNumber: parsedMatchNumber,
        status: "SCHEDULED",
      });

    if (validatedCricketConfig) {
      await db.orm.public.CricketMatchConfig.create(
        {
          matchId: match.id,
          ...validatedCricketConfig,
        }
      );
    }

    return NextResponse.json(
      match,
      { status: 201 }
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Failed to create match." },
      { status: 500 }
    );
  }
}