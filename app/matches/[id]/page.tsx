import Link from "next/link";
import { notFound } from "next/navigation";

import db from "@/lib/db";

import LiveScorecard from "./LiveScorecard";
import MatchSquadForm from "./MatchSquadForm";
import ScorerAssignmentForm from "./ScorerAssignmentForm";
import TossForm from "./TossForm";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function MatchPage({
  params,
}: PageProps) {
  const { id } = await params;

  const match = await db.orm.public.Match.where({ id }).first();

  if (!match) {
    notFound();
  }

  const [
    sport,
    tournament,
    homeTeam,
    awayTeam,
    cricketConfig,
    matchPlayers,
    allPlayers,
    allUsers,
    scorerAssignments,
    innings,
    stateEvents,
    winnerTeam,
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

    db.orm.public.CricketMatchConfig.where({
      matchId: match.id,
    }).first(),

    db.orm.public.MatchPlayer.where({
      matchId: match.id,
    }).all(),

    db.orm.public.Player.all(),

    db.orm.public.User.all(),

    db.orm.public.MatchScorerAssignment.where({
      matchId: match.id,
    }).all(),

    db.orm.public.CricketInnings.where({
      matchId: match.id,
    }).all(),

    db.orm.public.MatchEvent.where({
      matchId: match.id,
      type: "INNINGS_STATE",
    }).all(),

    match.winnerTeamId
      ? db.orm.public.Team.where({
          id: match.winnerTeamId,
        }).first()
      : Promise.resolve(null),
  ]);

  if (!homeTeam || !awayTeam) {
    notFound();
  }

  const isCricket =
    sport?.name?.toLowerCase() === "cricket";

  const homeMatchPlayers = matchPlayers.filter(
    (player) =>
      player.teamId === match.homeTeamId
  );

  const awayMatchPlayers = matchPlayers.filter(
    (player) =>
      player.teamId === match.awayTeamId
  );

  const homePlayers = allPlayers
    .filter(
      (player) =>
        player.teamId === match.homeTeamId
    )
    .map((player) => {
      const user = allUsers.find(
        (item) => item.id === player.userId
      );

      return {
        id: player.id,
        name: user?.name ?? "Unknown Player",
        jerseyNo: player.jerseyNo,
      };
    });

  const awayPlayers = allPlayers
    .filter(
      (player) =>
        player.teamId === match.awayTeamId
    )
    .map((player) => {
      const user = allUsers.find(
        (item) => item.id === player.userId
      );

      return {
        id: player.id,
        name: user?.name ?? "Unknown Player",
        jerseyNo: player.jerseyNo,
      };
    });

  /*
   * Only ASSIGNED and ACTIVE assignments are considered
   * current assignments.
   *
   * REVOKED assignments remain in the database as history
   * but must not appear as the current scorer.
   */
  const currentScorerAssignment =
    scorerAssignments.find(
      (assignment) =>
        assignment.status === "ASSIGNED" ||
        assignment.status === "ACTIVE"
    ) ?? null;

  const currentScorerUser = currentScorerAssignment
    ? allUsers.find(
        (user) =>
          user.id ===
          currentScorerAssignment.scorerId
      )
    : null;

  const availableScorers = allUsers
    .filter((user) => user.role === "SCORER")
    .map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
    }));

  /*
   * Temporary development fallback.
   *
   * Once authentication is wired into the application,
   * this should be replaced by the authenticated admin's
   * user ID.
   */
  const assigningAdmin =
    allUsers.find(
      (user) =>
        user.role === "SPORTS_ADMIN" ||
        user.role === "SUPER_ADMIN"
    ) ?? null;

  const scorerAssigned =
    currentScorerAssignment !== null;

  const currentInnings =
    innings.find(
      (item) => item.status === "IN_PROGRESS"
    ) ?? innings[innings.length - 1];

  const homePlayingCount =
    homeMatchPlayers.filter(
      (player) => player.role === "PLAYING"
    ).length;

  const awayPlayingCount =
    awayMatchPlayers.filter(
      (player) => player.role === "PLAYING"
    ).length;

  const squadConfirmed =
    isCricket &&
    cricketConfig !== null &&
    homePlayingCount ===
      cricketConfig.playersPerTeam &&
    awayPlayingCount ===
      cricketConfig.playersPerTeam;

  /*
   * Build the initial data for the LiveScorecard component.
   * This mirrors the shape returned by GET /api/matches/[id]/live
   * so the component hydrates without a loading state.
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

  const sortedInnings = [...innings].sort(
    (a, b) => b.inningsNumber - a.inningsNumber
  );

  const latestInnings = sortedInnings[0] ?? null;

  /* Resolve latest state event for the current innings */
  let liveLiveState: {
    strikerId: string | null;
    nonStrikerId: string | null;
    bowlerId: string | null;
    score: number;
    wickets: number;
    legalBalls: number;
    overNumber: number;
    lastAction: string;
    strikerName: string | null;
    nonStrikerName: string | null;
    bowlerName: string | null;
  } | null = null;

  if (latestInnings) {
    const relevant = stateEvents
      .filter((event) => {
        if (!event.data) return false;
        try {
          const d = JSON.parse(event.data) as {
            inningsId?: string;
          };
          return d.inningsId === latestInnings.id;
        } catch {
          return false;
        }
      })
      .sort(
        (a, b) =>
          b.timestamp.epochMilliseconds -
          a.timestamp.epochMilliseconds
      );

    if (relevant.length > 0) {
      try {
        const d = JSON.parse(
          relevant[0].data ?? "{}"
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

        liveLiveState = {
          strikerId: d.strikerId ?? null,
          nonStrikerId: d.nonStrikerId ?? null,
          bowlerId: d.bowlerId ?? null,
          score: d.score ?? latestInnings.runs,
          wickets:
            d.wickets ?? latestInnings.wickets,
          legalBalls:
            d.legalBalls ?? latestInnings.legalBalls,
          overNumber: d.overNumber ?? 1,
          lastAction: d.lastAction ?? "",
          strikerName: resolvePlayerName(
            d.strikerId ?? null
          ),
          nonStrikerName: resolvePlayerName(
            d.nonStrikerId ?? null
          ),
          bowlerName: resolvePlayerName(
            d.bowlerId ?? null
          ),
        };
      } catch {
        liveLiveState = null;
      }
    }
  }

  const liveScorecardInitialData = {
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
      ? { id: tournament.id, name: tournament.name }
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
      ? { id: winnerTeam.id, name: winnerTeam.name }
      : null,
    cricketConfig: cricketConfig
      ? {
          format: cricketConfig.format,
          overs: cricketConfig.overs,
          playersPerTeam: cricketConfig.playersPerTeam,
        }
      : null,
    innings: innings
      .slice()
      .sort(
        (a, b) => a.inningsNumber - b.inningsNumber
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
    liveState: liveLiveState,
  };

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white md:p-10">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/matches"
          className="text-sm text-slate-400 transition hover:text-white"
        >
          ← Back to Matches
        </Link>

        <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-blue-400">
              NMIMS Sports Hub
            </p>

            <h1 className="mt-2 text-4xl font-bold tracking-tight">
              {homeTeam.name}

              <span className="mx-3 text-slate-600">
                vs
              </span>

              {awayTeam.name}
            </h1>

            <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-400">
              {sport && (
                <span>{sport.name}</span>
              )}

              {tournament && (
                <>
                  <span>•</span>
                  <span>{tournament.name}</span>
                </>
              )}

              {match.round && (
                <>
                  <span>•</span>
                  <span>{match.round}</span>
                </>
              )}

              {match.matchNumber && (
                <>
                  <span>•</span>
                  <span>
                    Match #{match.matchNumber}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <span className="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium">
              {match.status}
            </span>

            {match.venue && (
              <span className="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-300">
                {match.venue}
              </span>
            )}
          </div>
        </div>

        <section className="mt-8 rounded-3xl border border-slate-800 bg-slate-900 p-8">
          <div className="grid items-center gap-8 md:grid-cols-[1fr_auto_1fr]">
            <div className="text-center md:text-right">
              <p className="text-3xl font-bold">
                {homeTeam.name}
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Home Team
              </p>
            </div>

            <div className="text-center">
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
                Match
              </p>

              <p className="mt-2 text-2xl font-bold text-slate-300">
                VS
              </p>
            </div>

            <div className="text-center md:text-left">
              <p className="text-3xl font-bold">
                {awayTeam.name}
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Away Team
              </p>
            </div>
          </div>
        </section>

        {isCricket && cricketConfig && (
          <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">
                Cricket
              </p>

              <h2 className="mt-2 text-2xl font-bold">
                Match Configuration
              </h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl bg-slate-950 p-4">
                <p className="text-xs text-slate-500">
                  Format
                </p>

                <p className="mt-1 font-semibold">
                  {cricketConfig.format}
                </p>
              </div>

              <div className="rounded-xl bg-slate-950 p-4">
                <p className="text-xs text-slate-500">
                  Overs
                </p>

                <p className="mt-1 font-semibold">
                  {cricketConfig.overs}
                </p>
              </div>

              <div className="rounded-xl bg-slate-950 p-4">
                <p className="text-xs text-slate-500">
                  Players / Team
                </p>

                <p className="mt-1 font-semibold">
                  {cricketConfig.playersPerTeam}
                </p>
              </div>

              <div className="rounded-xl bg-slate-950 p-4">
                <p className="text-xs text-slate-500">
                  Substitutes / Team
                </p>

                <p className="mt-1 font-semibold">
                  {cricketConfig.substitutesPerTeam}
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <RuleBadge
                label="Wide"
                enabled={cricketConfig.wideEnabled}
              />

              <RuleBadge
                label="No Ball"
                enabled={cricketConfig.noBallEnabled}
              />

              <RuleBadge
                label="Bye"
                enabled={cricketConfig.byeEnabled}
              />

              <RuleBadge
                label="Leg Bye"
                enabled={cricketConfig.legByeEnabled}
              />

              <RuleBadge
                label="Penalty Runs"
                enabled={
                  cricketConfig.penaltyRunsEnabled
                }
              />
            </div>
          </section>
        )}

        {isCricket && cricketConfig && (
          <MatchSquadForm
            matchId={match.id}
            homeTeam={{
              id: homeTeam.id,
              name: homeTeam.name,
              players: homePlayers,
            }}
            awayTeam={{
              id: awayTeam.id,
              name: awayTeam.name,
              players: awayPlayers,
            }}
            playersPerTeam={
              cricketConfig.playersPerTeam
            }
            substitutesPerTeam={
              cricketConfig.substitutesPerTeam
            }
            existingPlayers={matchPlayers.map(
              (player) => ({
                id: player.id,
                playerId: player.playerId,
                teamId: player.teamId,
                role: player.role,
                position: player.position,
              })
            )}
          />
        )}

        {isCricket && cricketConfig && (
          <ScorerAssignmentForm
            matchId={match.id}
            scorers={availableScorers}
            assignedById={
              assigningAdmin?.id ?? null
            }
            currentScorer={
              currentScorerUser
                ? {
                    id: currentScorerUser.id,
                    name: currentScorerUser.name,
                    email: currentScorerUser.email,
                  }
                : null
            }
          />
        )}

        {isCricket &&
          cricketConfig &&
          match.status === "SCHEDULED" && (
            <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <div className="mb-6">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">
                  Match Start
                </p>

                <h2 className="mt-2 text-2xl font-bold">
                  Toss & Start Innings
                </h2>

                <p className="mt-2 text-sm text-slate-400">
                  Complete the Playing XI and assign the
                  match scorer before starting the toss.
                </p>
              </div>

              {!squadConfirmed ? (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-300">
                  Both teams must have exactly{" "}
                  {cricketConfig.playersPerTeam}{" "}
                  Playing XI players before the toss
                  can be started.
                </div>
              ) : !scorerAssigned ? (
                <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-4 text-sm text-purple-300">
                  A scorer must be assigned to this match
                  before the toss can be started.
                </div>
              ) : (
                <TossForm
                  matchId={match.id}
                  homeTeam={{
                    id: homeTeam.id,
                    name: homeTeam.name,
                  }}
                  awayTeam={{
                    id: awayTeam.id,
                    name: awayTeam.name,
                  }}
                />
              )}
            </section>
          )}

        {(match.status === "LIVE" ||
          match.status === "COMPLETED") &&
          isCricket && (
            <LiveScorecard
              matchId={match.id}
              initialData={liveScorecardInitialData}
            />
          )}

        {/*
         * The innings breakdown is now rendered inside LiveScorecard
         * for LIVE and COMPLETED cricket matches.  For non-cricket
         * or SCHEDULED matches we keep a simple fallback.
         */}
        {innings.length > 0 &&
          !isCricket &&
          match.status !== "SCHEDULED" && (
            <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <div className="mb-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Match Progress
                </p>

                <h2 className="mt-2 text-2xl font-bold">
                  Innings
                </h2>
              </div>

              <div className="space-y-3">
                {innings
                  .slice()
                  .sort(
                    (a, b) =>
                      a.inningsNumber -
                      b.inningsNumber
                  )
                  .map((inning) => {
                    const battingTeam =
                      inning.battingTeamId ===
                      homeTeam.id
                        ? homeTeam.name
                        : awayTeam.name;

                    return (
                      <div
                        key={inning.id}
                        className="flex flex-col gap-3 rounded-xl bg-slate-950 p-4 md:flex-row md:items-center md:justify-between"
                      >
                        <div>
                          <p className="font-semibold">
                            Innings{" "}
                            {inning.inningsNumber}
                          </p>

                          <p className="mt-1 text-sm text-slate-500">
                            {battingTeam}
                          </p>
                        </div>

                        <div className="text-left md:text-right">
                          <p className="text-xl font-bold">
                            {inning.runs}/
                            {inning.wickets}
                          </p>

                          <p className="text-xs text-slate-500">
                            {inning.legalBalls} legal balls
                            {" • "}
                            {inning.status}
                          </p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </section>
          )}

        {currentScorerAssignment && (
          <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Current Scorer
            </p>

            <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-bold">
                  {currentScorerUser?.name ??
                    "Assigned Scorer"}
                </h2>

                {currentScorerUser?.email && (
                  <p className="mt-1 text-sm text-slate-500">
                    {currentScorerUser.email}
                  </p>
                )}
              </div>

              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
                {currentScorerAssignment.status}
              </span>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function RuleBadge({
  label,
  enabled,
}: {
  label: string;
  enabled: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm ${
        enabled
          ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-300"
          : "border-slate-800 bg-slate-950 text-slate-600"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span>{label}</span>

        <span className="text-xs">
          {enabled ? "ON" : "OFF"}
        </span>
      </div>
    </div>
  );
}