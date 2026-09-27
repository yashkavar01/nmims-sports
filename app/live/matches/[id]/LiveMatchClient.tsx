"use client";

import { useCallback, useEffect, useState } from "react";

type Delivery = {
  id: string;
  ballNumber: number;
  legalBall: boolean;
  runsOffBat: number;
  extras: number;
  totalRuns: number;
  extraType: string | null;
  wicket: boolean;
  wicketType: string | null;
};

type Team = {
  id: string;
  name: string;
};

type MatchData = {
  match: {
    id: string;
    status: string;
    venue: string | null;
    format: string | null;
    scheduledAt: string | null;
    result: string | null;
    winnerTeam: Team | null;
  };

  teams: {
    home: Team;
    away: Team;
  };

  innings: {
    id: string;
    number: number;
    battingTeamId: string;
    bowlingTeamId: string;
    score: number;
    wickets: number;
    overs: string;
    legalBalls: number;
    target: number | null;
    runsRequired: number | null;
    ballsRemaining: number | null;
    status: string;
  } | null;

  currentOver: {
    number: number;
    bowler: {
      id: string;
      name: string | null;
    } | null;
    striker: string | null;
    nonStriker: string | null;
    deliveries: Delivery[];
  } | null;

  config: {
    overs: number;
    playersPerTeam: number;
    inningsPerTeam: number;
  } | null;
};

function getStatusLabel(status: string) {
  switch (status) {
    case "LIVE":
      return "LIVE";

    case "COMPLETED":
      return "COMPLETED";

    case "CANCELLED":
      return "CANCELLED";

    case "SCHEDULED":
      return "UPCOMING";

    default:
      return status;
  }
}

function getDeliveryLabel(delivery: Delivery) {
  if (delivery.wicket) {
    return "W";
  }

  if (delivery.extraType) {
    if (delivery.totalRuns === 0) {
      return delivery.extraType;
    }

    return `${delivery.totalRuns} ${delivery.extraType}`;
  }

  return String(delivery.totalRuns);
}

function getBattingTeam(data: MatchData) {
  if (!data.innings) {
    return null;
  }

  if (data.innings.battingTeamId === data.teams.home.id) {
    return data.teams.home;
  }

  if (data.innings.battingTeamId === data.teams.away.id) {
    return data.teams.away;
  }

  return null;
}

function getBowlingTeam(data: MatchData) {
  if (!data.innings) {
    return null;
  }

  if (data.innings.bowlingTeamId === data.teams.home.id) {
    return data.teams.home;
  }

  if (data.innings.bowlingTeamId === data.teams.away.id) {
    return data.teams.away;
  }

  return null;
}

export default function LiveMatchClient({
  matchId,
}: {
  matchId: string;
}) {
  const [data, setData] = useState<MatchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMatch = useCallback(async () => {
    try {
      const response = await fetch(`/api/public/matches/${matchId}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Unable to load match");
      }

      const result = (await response.json()) as MatchData;

      setData(result);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Unable to load match data");
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    loadMatch();

    const interval = window.setInterval(() => {
      loadMatch();
    }, 3000);

    return () => {
      window.clearInterval(interval);
    };
  }, [loadMatch]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-6">
          <div className="text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-white" />
            <p className="text-sm text-slate-400">
              Loading live match...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
            <h1 className="text-xl font-semibold">
              Match unavailable
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              {error ?? "The requested match could not be loaded."}
            </p>

            <button
              onClick={loadMatch}
              className="mt-6 rounded-lg bg-white px-5 py-2 text-sm font-medium text-slate-950 transition hover:bg-slate-200"
            >
              Try again
            </button>
          </div>
        </div>
      </main>
    );
  }

  const battingTeam = getBattingTeam(data);
  const bowlingTeam = getBowlingTeam(data);

  const isLive = data.match.status === "LIVE";
  const isCompleted = data.match.status === "COMPLETED";

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
              NMIMS Sports Hub
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              Live Match Center
            </h1>
          </div>

          <div
            className={`inline-flex w-fit items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wider ${
              isLive
                ? "border-red-500/30 bg-red-500/10 text-red-400"
                : isCompleted
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  : "border-slate-700 bg-slate-900 text-slate-400"
            }`}
          >
            {isLive && (
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            )}

            {getStatusLabel(data.match.status)}
          </div>
        </header>

        {/* Match information */}
        <section className="rounded-3xl border border-slate-800 bg-slate-900/80 shadow-2xl">
          <div className="border-b border-slate-800 px-5 py-4 sm:px-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  {data.match.format ?? "Match"}
                </p>

                {data.match.venue && (
                  <p className="mt-1 text-sm text-slate-400">
                    {data.match.venue}
                  </p>
                )}
              </div>

              {data.config && (
                <div className="rounded-lg bg-slate-800 px-3 py-2 text-xs text-slate-400">
                  {data.config.overs} overs
                </div>
              )}
            </div>
          </div>

          {/* Teams and score */}
          <div className="grid gap-6 px-5 py-8 sm:px-8 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
            {/* Home */}
            <div className="text-center lg:text-right">
              <p className="text-sm uppercase tracking-wider text-slate-500">
                Home
              </p>

              <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
                {data.teams.home.name}
              </h2>

              {battingTeam?.id === data.teams.home.id && (
                <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  Batting
                </p>
              )}
            </div>

            {/* Score */}
            <div className="text-center">
              {data.innings ? (
                <>
                  <div className="text-5xl font-bold tracking-tight sm:text-6xl">
                    {data.innings.score}
                    <span className="text-3xl text-slate-500">
                      /{data.innings.wickets}
                    </span>
                  </div>

                  <p className="mt-2 text-sm font-medium text-slate-400">
                    {data.innings.overs} overs
                  </p>
                </>
              ) : (
                <div className="text-lg text-slate-500">
                  Match not started
                </div>
              )}
            </div>

            {/* Away */}
            <div className="text-center lg:text-left">
              <p className="text-sm uppercase tracking-wider text-slate-500">
                Away
              </p>

              <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
                {data.teams.away.name}
              </h2>

              {battingTeam?.id === data.teams.away.id && (
                <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  Batting
                </p>
              )}
            </div>
          </div>

          {/* Innings information */}
          {data.innings && (
            <div className="border-t border-slate-800 px-5 py-5 sm:px-8">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  label="Innings"
                  value={String(data.innings.number)}
                />

                <StatCard
                  label="Batting"
                  value={battingTeam?.name ?? "—"}
                />

                <StatCard
                  label="Bowling"
                  value={bowlingTeam?.name ?? "—"}
                />

                <StatCard
                  label="Status"
                  value={data.innings.status.replaceAll("_", " ")}
                />
              </div>

              {data.innings.target !== null && (
                <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-slate-500">
                        Target
                      </p>

                      <p className="mt-1 text-lg font-semibold">
                        {data.innings.target}
                      </p>
                    </div>

                    {data.innings.runsRequired !== null && (
                      <div className="text-right">
                        <p className="text-xs uppercase tracking-wider text-slate-500">
                          Runs Required
                        </p>

                        <p className="mt-1 text-lg font-semibold text-emerald-400">
                          {data.innings.runsRequired}
                        </p>
                      </div>
                    )}

                    {data.innings.ballsRemaining !== null && (
                      <div className="text-right">
                        <p className="text-xs uppercase tracking-wider text-slate-500">
                          Balls Remaining
                        </p>

                        <p className="mt-1 text-lg font-semibold">
                          {data.innings.ballsRemaining}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Current players */}
        {data.currentOver && (
          <section className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Batters
              </p>

              <div className="mt-5 space-y-4">
                <PlayerRow
                  label="Striker"
                  name={data.currentOver.striker}
                />

                <PlayerRow
                  label="Non-Striker"
                  name={data.currentOver.nonStriker}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Current Bowler
              </p>

              <div className="mt-5">
                <p className="text-xl font-semibold">
                  {data.currentOver.bowler?.name ?? "—"}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Over {data.currentOver.number}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Current over */}
        {data.currentOver && (
          <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Live Feed
                </p>

                <h2 className="mt-1 text-xl font-bold">
                  Over {data.currentOver.number}
                </h2>
              </div>

              <p className="text-sm text-slate-500">
                {data.currentOver.deliveries.length} balls recorded
              </p>
            </div>

            {data.currentOver.deliveries.length === 0 ? (
              <div className="mt-6 rounded-xl border border-dashed border-slate-800 py-10 text-center text-sm text-slate-500">
                Waiting for the first delivery...
              </div>
            ) : (
              <div className="mt-6 flex flex-wrap gap-3">
                {data.currentOver.deliveries.map((delivery) => (
                  <div
                    key={delivery.id}
                    className={`flex h-12 min-w-12 items-center justify-center rounded-full border px-3 text-sm font-bold ${
                      delivery.wicket
                        ? "border-red-500/40 bg-red-500/10 text-red-400"
                        : delivery.totalRuns === 4
                          ? "border-blue-500/40 bg-blue-500/10 text-blue-400"
                          : delivery.totalRuns === 6
                            ? "border-purple-500/40 bg-purple-500/10 text-purple-400"
                            : "border-slate-700 bg-slate-800 text-slate-200"
                    }`}
                    title={
                      delivery.legalBall
                        ? `Legal ball ${delivery.ballNumber}`
                        : `Extra ball ${delivery.ballNumber}`
                    }
                  >
                    {getDeliveryLabel(delivery)}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Match result */}
        {isCompleted && (
          <section className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Match Result
            </p>

            {data.match.result ? (
              <h2 className="mt-3 text-2xl font-bold">
                {data.match.result}
              </h2>
            ) : data.match.winnerTeam ? (
              <h2 className="mt-3 text-2xl font-bold">
                {data.match.winnerTeam.name} won
              </h2>
            ) : (
              <h2 className="mt-3 text-2xl font-bold">
                Match completed
              </h2>
            )}
          </section>
        )}

        {/* Footer */}
        <footer className="py-8 text-center">
          <p className="text-xs text-slate-600">
            NMIMS Sports Hub · Live Match Center
          </p>
        </footer>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-950/60 p-4">
      <p className="text-xs uppercase tracking-wider text-slate-500">
        {label}
      </p>

      <p className="mt-2 truncate text-sm font-semibold text-slate-200">
        {value}
      </p>
    </div>
  );
}

function PlayerRow({
  label,
  name,
}: {
  label: string;
  name: string | null;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-xs uppercase tracking-wider text-slate-500">
          {label}
        </p>

        <p className="mt-1 font-semibold">
          {name ?? "—"}
        </p>
      </div>

      <div className="h-2 w-2 rounded-full bg-emerald-400" />
    </div>
  );
}