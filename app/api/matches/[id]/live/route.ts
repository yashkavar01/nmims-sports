import { NextRequest, NextResponse } from "next/server";

import db from "@/lib/db";

/**
 * GET /api/matches/[id]/live
 *
 * Public, unauthenticated endpoint that returns the current live
 * state of a match for spectators.  Designed for frequent polling
 * (every 10 seconds) so it must be as lightweight as possible.
 *
 * Returns a 200 with the match snapshot including:
 *  - match status, result, venue
 *  - homeTeam / awayTeam names
 *  - all innings (sorted by inningsNumber)
 *  - latest INNINGS_STATE event for the current active innings
 *    (strikerId, nonStrikerId, bowlerId so the public view can show names)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: matchId } = await params;

    const match = await db.orm.public.Match.where({
      id: matchId,
    }).first();

    if (!match) {
      return NextResponse.json(
        { error: "Match not found." },
        { status: 404 }
      );
    }

    const [
      sport,
      tournament,
      homeTeam,
      awayTeam,
      winnerTeam,
      cricketConfig,
      innings,
      stateEvents,
      allPlayers,
      allUsers,
      matchPlayers,
    ] = await Promise.all([
      db.orm.public.Sport.where({
        id: match.sportId,
      }).first(),

      match.tournamentId
        ? db.orm.public.Tournament.where({
            id: match.tournamentId,
          }).first()
        : Promise.resolve(null),

      db.orm.public.Team.where({
        id: match.homeTeamId,
      }).first(),

      db.orm.public.Team.where({
        id: match.awayTeamId,
      }).first(),

      match.winnerTeamId
        ? db.orm.public.Team.where({
            id: match.winnerTeamId,
          }).first()
        : Promise.resolve(null),

      db.orm.public.CricketMatchConfig.where({
        matchId: match.id,
      }).first(),

      db.orm.public.CricketInnings.where({
        matchId: match.id,
      }).all(),

      db.orm.public.MatchEvent.where({
        matchId: match.id,
        type: "INNINGS_STATE",
      }).all(),

      db.orm.public.Player.all(),

      db.orm.public.User.all(),

      db.orm.public.MatchPlayer.where({
        matchId: match.id,
      }).all(),
    ]);

    /*
     * Find the current (latest) innings.
     */
    const sortedInnings = [...innings].sort(
      (a, b) => b.inningsNumber - a.inningsNumber
    );

    const currentInnings = sortedInnings[0] ?? null;

    /*
     * Resolve the latest INNINGS_STATE event to get current
     * striker / non-striker / bowler IDs for the spectator view.
     */
    let liveState: {
      strikerId: string | null;
      nonStrikerId: string | null;
      bowlerId: string | null;
      score: number;
      wickets: number;
      legalBalls: number;
      overNumber: number;
      lastAction: string;
    } | null = null;

    if (currentInnings) {
      const relevantStateEvents = stateEvents
        .filter((event) => {
          if (!event.data) return false;
          try {
            const data = JSON.parse(event.data) as {
              inningsId?: string;
            };
            return data.inningsId === currentInnings.id;
          } catch {
            return false;
          }
        })
        .sort(
          (a, b) =>
            b.timestamp.epochMilliseconds -
            a.timestamp.epochMilliseconds
        );

      if (relevantStateEvents.length > 0) {
        try {
          const data = JSON.parse(
            relevantStateEvents[0].data ?? "{}"
          ) as {
            strikerId?: string;
            nonStrikerId?: string;
            bowlerId?: string;
            score?: number;
            wickets?: number;
            legalBalls?: number;
            overNumber?: number;
            lastAction?: string;
          };

          liveState = {
            strikerId: data.strikerId ?? null,
            nonStrikerId: data.nonStrikerId ?? null,
            bowlerId: data.bowlerId ?? null,
            score:
              data.score ?? currentInnings.runs,
            wickets:
              data.wickets ?? currentInnings.wickets,
            legalBalls:
              data.legalBalls ??
              currentInnings.legalBalls,
            overNumber: data.overNumber ?? 1,
            lastAction:
              data.lastAction ?? "",
          };
        } catch {
          liveState = null;
        }
      }
    }

    /*
     * Helper to resolve a player name from ID.
     */
    function resolvePlayerName(
      playerId: string | null
    ): string | null {
      if (!playerId) return null;

      const player = allPlayers.find(
        (p) => p.id === playerId
      );
      if (!player) return null;

      const user = allUsers.find(
        (u) => u.id === player.userId
      );
      return user?.name ?? null;
    }

    /*
     * Build the playing XI for both teams (names only for the
     * public view — no sensitive admin data).
     */
    function buildSquad(teamId: string) {
      return matchPlayers
        .filter(
          (mp) =>
            mp.teamId === teamId &&
            mp.role === "PLAYING"
        )
        .map((mp) => {
          const player = allPlayers.find(
            (p) => p.id === mp.playerId
          );
          const user = player
            ? allUsers.find(
                (u) => u.id === player.userId
              )
            : null;
          return {
            id: mp.playerId,
            name: user?.name ?? "Unknown",
            jerseyNo: player?.jerseyNo ?? null,
          };
        });
    }

    return NextResponse.json(
      {
        match: {
          id: match.id,
          status: match.status,
          result: match.result,
          venue: match.venue,
          round: match.round,
          matchNumber: match.matchNumber,
        },

        sport: sport
          ? { id: sport.id, name: sport.name }
          : null,

        tournament: tournament
          ? {
              id: tournament.id,
              name: tournament.name,
            }
          : null,

        homeTeam: homeTeam
          ? {
              id: homeTeam.id,
              name: homeTeam.name,
              squad: buildSquad(homeTeam.id),
            }
          : null,

        awayTeam: awayTeam
          ? {
              id: awayTeam.id,
              name: awayTeam.name,
              squad: buildSquad(awayTeam.id),
            }
          : null,

        winnerTeam: winnerTeam
          ? {
              id: winnerTeam.id,
              name: winnerTeam.name,
            }
          : null,

        cricketConfig: cricketConfig
          ? {
              format: cricketConfig.format,
              overs: cricketConfig.overs,
              playersPerTeam:
                cricketConfig.playersPerTeam,
            }
          : null,

        innings: innings
          .slice()
          .sort(
            (a, b) =>
              a.inningsNumber - b.inningsNumber
          )
          .map((inn) => ({
            id: inn.id,
            inningsNumber: inn.inningsNumber,
            battingTeamId: inn.battingTeamId,
            bowlingTeamId: inn.bowlingTeamId,
            runs: inn.runs,
            wickets: inn.wickets,
            legalBalls: inn.legalBalls,
            target: inn.target,
            status: inn.status,
          })),

        liveState: liveState
          ? {
              ...liveState,
              strikerName: resolvePlayerName(
                liveState.strikerId
              ),
              nonStrikerName: resolvePlayerName(
                liveState.nonStrikerId
              ),
              bowlerName: resolvePlayerName(
                liveState.bowlerId
              ),
            }
          : null,
      },
      {
        status: 200,
        headers: {
          /*
           * Allow the CDN / browser to cache for 5 seconds.
           * This avoids hammering the DB on every spectator
           * refresh while keeping data reasonably fresh.
           */
          "Cache-Control":
            "public, s-maxage=5, stale-while-revalidate=10",
        },
      }
    );
  } catch (error) {
    console.error("Live match API error:", error);
    return NextResponse.json(
      { error: "Failed to load live match data." },
      { status: 500 }
    );
  }
}
