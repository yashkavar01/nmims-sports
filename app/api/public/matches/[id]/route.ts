import { NextResponse } from "next/server";
import db from "@/lib/db";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type CurrentOver = {
  id: string;
  inningsId: string;
  overNumber: number;
  bowlerId: string;
};

function instantToISOString(value: unknown): string | null {
  if (!value) {
    return null;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toString" in value
  ) {
    return String(value);
  }

  return null;
}

function formatOvers(legalBalls: number): string {
  const overs = Math.floor(legalBalls / 6);
  const balls = legalBalls % 6;

  return `${overs}.${balls}`;
}

async function getPlayerName(
  playerId: string | null
): Promise<string | null> {
  if (!playerId) {
    return null;
  }

  const player = await db.orm.public.Player.where({
    id: playerId,
  }).first();

  if (!player) {
    return null;
  }

  const user = await db.orm.public.User.where({
    id: player.userId,
  }).first();

  return user?.name ?? null;
}

export async function GET(
  _request: Request,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const match = await db.orm.public.Match.where({
      id,
    }).first();

    if (!match) {
      return NextResponse.json(
        {
          error: "Match not found",
        },
        {
          status: 404,
        }
      );
    }

    const homeTeam = await db.orm.public.Team.where({
      id: match.homeTeamId,
    }).first();

    const awayTeam = await db.orm.public.Team.where({
      id: match.awayTeamId,
    }).first();

    if (!homeTeam || !awayTeam) {
      return NextResponse.json(
        {
          error: "Match teams could not be found",
        },
        {
          status: 404,
        }
      );
    }

    const config = await db.orm.public.CricketMatchConfig.where({
      matchId: match.id,
    }).first();

    const inningsList = await db.orm.public.CricketInnings.where({
      matchId: match.id,
    }).all();

    const sortedInnings = [...inningsList].sort(
      (a, b) => b.inningsNumber - a.inningsNumber
    );

    const currentInnings = sortedInnings[0] ?? null;

    let currentOver: CurrentOver | null = null;
    let currentOverBowler = null;
    let currentOverDeliveries: Array<{
      id: string;
      ballNumber: number;
      legalBall: boolean;
      runsOffBat: number;
      extras: number;
      totalRuns: number;
      extraType: string | null;
      wicket: boolean;
      wicketType: string | null;
    }> = [];

    let striker: string | null = null;
    let nonStriker: string | null = null;

    if (currentInnings) {
      const overs = await db.orm.public.CricketOver.where({
        inningsId: currentInnings.id,
      }).all();

      const sortedOvers = [...overs].sort(
        (a, b) => b.overNumber - a.overNumber
      );

      const latestOver = sortedOvers[0];

      if (latestOver) {
        currentOver = {
          id: latestOver.id,
          inningsId: latestOver.inningsId,
          overNumber: latestOver.overNumber,
          bowlerId: latestOver.bowlerId,
        };

        currentOverBowler = await db.orm.public.Player.where({
          id: currentOver.bowlerId,
        }).first();

        const deliveries = await db.orm.public.CricketDelivery.where({
          overId: currentOver.id,
        }).all();

        currentOverDeliveries = [...deliveries]
          .sort((a, b) => a.ballNumber - b.ballNumber)
          .map((delivery) => ({
            id: delivery.id,
            ballNumber: delivery.ballNumber,
            legalBall: delivery.legalBall,
            runsOffBat: delivery.runsOffBat,
            extras: delivery.extras,
            totalRuns: delivery.totalRuns,
            extraType: delivery.extraType,
            wicket: delivery.wicket,
            wicketType: delivery.wicketType,
          }));

        const inningsStates = await db.orm.public.MatchEvent.where({
          matchId: match.id,
          type: "INNINGS_STATE",
        }).all();

        let latestState: {
          strikerId?: string | null;
          nonStrikerId?: string | null;
        } | null = null;

        for (const event of inningsStates) {
          if (!event.data) {
            continue;
          }

          try {
            const state = JSON.parse(event.data);

            if (
              state?.inningsId === currentInnings.id &&
              state?.overId === currentOver.id
            ) {
              latestState = state;
            }
          } catch {
            continue;
          }
        }

        if (latestState) {
          striker = latestState.strikerId
            ? await getPlayerName(latestState.strikerId)
            : null;

          nonStriker = latestState.nonStrikerId
            ? await getPlayerName(latestState.nonStrikerId)
            : null;
        }
      }
    }

    const bowlerName = currentOverBowler
      ? await getPlayerName(currentOverBowler.id)
      : null;

    const target = currentInnings?.target ?? null;
    const runs = currentInnings?.runs ?? 0;
    const wickets = currentInnings?.wickets ?? 0;
    const legalBalls = currentInnings?.legalBalls ?? 0;

    const oversLimit =
      config?.overs ??
      match.maxOvers ??
      null;

    const maximumLegalBalls =
      oversLimit !== null
        ? oversLimit * 6
        : null;

    const runsRequired =
      target !== null
        ? Math.max(target - runs, 0)
        : null;

    const ballsRemaining =
      maximumLegalBalls !== null
        ? Math.max(maximumLegalBalls - legalBalls, 0)
        : null;

    let winnerTeam: {
      id: string;
      name: string;
    } | null = null;

    if (match.winnerTeamId) {
      if (match.winnerTeamId === homeTeam.id) {
        winnerTeam = {
          id: homeTeam.id,
          name: homeTeam.name,
        };
      }

      if (match.winnerTeamId === awayTeam.id) {
        winnerTeam = {
          id: awayTeam.id,
          name: awayTeam.name,
        };
      }
    }

    const response = {
      match: {
        id: match.id,
        status: match.status,
        venue: match.venue,
        format: config?.format ?? match.format,
        scheduledAt: instantToISOString(match.scheduledAt),
        result: match.result,
        winnerTeam,
      },

      teams: {
        home: {
          id: homeTeam.id,
          name: homeTeam.name,
        },

        away: {
          id: awayTeam.id,
          name: awayTeam.name,
        },
      },

      innings: currentInnings
        ? {
            id: currentInnings.id,
            number: currentInnings.inningsNumber,
            battingTeamId: currentInnings.battingTeamId,
            bowlingTeamId: currentInnings.bowlingTeamId,
            score: runs,
            wickets,
            overs: formatOvers(legalBalls),
            legalBalls,
            target,
            runsRequired,
            ballsRemaining,
            status: currentInnings.status,
          }
        : null,

      currentOver: currentOver
        ? {
            number: currentOver.overNumber,

            bowler: currentOverBowler
              ? {
                  id: currentOverBowler.id,
                  name: bowlerName,
                }
              : null,

            striker,
            nonStriker,

            deliveries: currentOverDeliveries,
          }
        : null,

      config: config
        ? {
            overs: config.overs,
            playersPerTeam: config.playersPerTeam,
            inningsPerTeam: config.inningsPerTeam,
          }
        : null,
    };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control":
          "public, s-maxage=2, stale-while-revalidate=5",
      },
    });
  } catch (error) {
    console.error("Public match API error:", error);

    return NextResponse.json(
      {
        error: "Failed to load match",
      },
      {
        status: 500,
      }
    );
  }
}