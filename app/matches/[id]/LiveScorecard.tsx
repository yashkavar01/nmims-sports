"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

/* ── Types ──────────────────────────────────────────────── */

type Squad = {
  id: string;
  name: string;
  jerseyNo: number | null;
}[];

type Team = {
  id: string;
  name: string;
  squad: Squad;
};

type Innings = {
  id: string;
  inningsNumber: number;
  battingTeamId: string;
  bowlingTeamId: string;
  runs: number;
  wickets: number;
  legalBalls: number;
  target: number | null;
  status: string;
};

type LiveState = {
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
};

type MatchData = {
  match: {
    id: string;
    status: string;
    result: string | null;
    venue: string | null;
    round: string | null;
    matchNumber: number | null;
  };
  sport: { id: string; name: string } | null;
  tournament: {
    id: string;
    name: string;
  } | null;
  homeTeam: Team | null;
  awayTeam: Team | null;
  winnerTeam: { id: string; name: string } | null;
  cricketConfig: {
    format: string;
    overs: number;
    playersPerTeam: number;
  } | null;
  innings: Innings[];
  liveState: LiveState | null;
};

/* ── Helpers ─────────────────────────────────────────────── */

function formatOvers(legalBalls: number): string {
  const completedOvers = Math.floor(legalBalls / 6);
  const ballsInOver = legalBalls % 6;
  return `${completedOvers}.${ballsInOver}`;
}

function TeamScore({
  team,
  innings,
  isCurrentlyBatting,
}: {
  team: Team;
  innings: Innings[];
  isCurrentlyBatting: boolean;
}) {
  const teamInnings = innings.filter(
    (inn) => inn.battingTeamId === team.id
  );

  return (
    <div
      className={`relative flex-1 rounded-2xl border p-6 transition-all ${
        isCurrentlyBatting
          ? "border-emerald-500/40 bg-emerald-500/5"
          : "border-slate-800 bg-slate-900"
      }`}
    >
      {isCurrentlyBatting && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="rounded-full border border-emerald-500/50 bg-slate-950 px-3 py-1 text-xs font-semibold text-emerald-400">
            BATTING
          </span>
        </div>
      )}

      <p
        className={`text-center text-xl font-bold ${
          isCurrentlyBatting
            ? "text-white"
            : "text-slate-300"
        }`}
      >
        {team.name}
      </p>

      {teamInnings.map((inn) => (
        <div key={inn.id} className="mt-4 text-center">
          <p
            className={`text-4xl font-bold tabular-nums tracking-tight ${
              isCurrentlyBatting
                ? "text-white"
                : "text-slate-400"
            }`}
          >
            {inn.runs}
            <span className="text-2xl text-slate-500">
              /{inn.wickets}
            </span>
          </p>

          <p className="mt-1 text-sm text-slate-500">
            {formatOvers(inn.legalBalls)} ov
            {inn.target !== null && (
              <span className="ml-2 text-amber-400">
                Target: {inn.target}
              </span>
            )}
          </p>
        </div>
      ))}

      {teamInnings.length === 0 && (
        <p className="mt-4 text-center text-sm text-slate-600">
          Yet to bat
        </p>
      )}
    </div>
  );
}

/* ── Main Component ──────────────────────────────────────── */

export default function LiveScorecard({
  matchId,
  initialData,
}: {
  matchId: string;
  initialData: MatchData;
}) {
  const [data, setData] =
    useState<MatchData>(initialData);
  const [lastUpdated, setLastUpdated] =
    useState<Date>(new Date());
  const [fetchError, setFetchError] =
    useState(false);
  const [refreshing, setRefreshing] =
    useState(false);

  const intervalRef = useRef<ReturnType<
    typeof setInterval
  > | null>(null);

  const fetchLiveData = useCallback(async () => {
    try {
      setRefreshing(true);
      const response = await fetch(
        `/api/matches/${matchId}/live`,
        { cache: "no-store" }
      );

      if (!response.ok) {
        setFetchError(true);
        return;
      }

      const freshData =
        (await response.json()) as MatchData;
      setData(freshData);
      setLastUpdated(new Date());
      setFetchError(false);
    } catch {
      setFetchError(true);
    } finally {
      setRefreshing(false);
    }
  }, [matchId]);

  useEffect(() => {
    /* Only poll when match is LIVE */
    if (data.match.status !== "LIVE") return;

    intervalRef.current = setInterval(() => {
      void fetchLiveData();
    }, 10_000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [data.match.status, fetchLiveData]);

  const {
    match,
    homeTeam,
    awayTeam,
    winnerTeam,
    innings,
    liveState,
    cricketConfig,
  } = data;

  const currentInnings = innings
    .slice()
    .sort(
      (a, b) => b.inningsNumber - a.inningsNumber
    )[0];

  const battingTeamId =
    currentInnings?.battingTeamId ?? null;

  const isLive = match.status === "LIVE";
  const isCompleted = match.status === "COMPLETED";

  /* Target chase info for innings 2 */
  const chaseInfo =
    currentInnings?.inningsNumber === 2 &&
    currentInnings.target !== null &&
    liveState
      ? {
          target: currentInnings.target,
          runsRequired: Math.max(
            currentInnings.target - liveState.score,
            0
          ),
          ballsRemaining: cricketConfig
            ? Math.max(
                cricketConfig.overs * 6 -
                  liveState.legalBalls,
                0
              )
            : null,
          targetReached:
            liveState.score >= currentInnings.target,
        }
      : null;

  return (
    <section className="mt-8 space-y-6">
      {/* ── Status Header ── */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex flex-wrap items-center gap-3">
          {isLive && (
            <span className="flex items-center gap-2 rounded-full border border-red-500/40 bg-red-500/10 px-4 py-1.5 text-sm font-bold text-red-400">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-400" />
              LIVE
            </span>
          )}

          {isCompleted && (
            <span className="rounded-full border border-slate-600 bg-slate-800 px-4 py-1.5 text-sm font-semibold text-slate-300">
              COMPLETED
            </span>
          )}

          {match.venue && (
            <span className="text-sm text-slate-500">
              📍 {match.venue}
            </span>
          )}

          {cricketConfig && (
            <span className="text-sm text-slate-500">
              {cricketConfig.overs}-over{" "}
              {cricketConfig.format}
            </span>
          )}

          {isLive && (
            <span
              className={`ml-auto text-xs text-slate-600 transition-opacity ${
                refreshing ? "opacity-100" : "opacity-50"
              }`}
            >
              {refreshing
                ? "Updating…"
                : `Updated ${lastUpdated.toLocaleTimeString()}`}
            </span>
          )}
        </div>

        {/* ── Match result ── */}
        {isCompleted && match.result && (
          <div className="mt-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center">
            {winnerTeam && (
              <p className="text-lg font-semibold text-emerald-300">
                🏆 {winnerTeam.name}
              </p>
            )}
            <p className="mt-1 text-2xl font-bold text-white">
              {match.result}
            </p>
          </div>
        )}

        {/* ── Team scorecards ── */}
        <div className="mt-6 flex flex-col gap-4 md:flex-row">
          {homeTeam && (
            <TeamScore
              team={homeTeam}
              innings={innings}
              isCurrentlyBatting={
                battingTeamId === homeTeam.id &&
                isLive
              }
            />
          )}

          <div className="flex items-center justify-center">
            <span className="text-xl font-bold text-slate-600">
              vs
            </span>
          </div>

          {awayTeam && (
            <TeamScore
              team={awayTeam}
              innings={innings}
              isCurrentlyBatting={
                battingTeamId === awayTeam.id &&
                isLive
              }
            />
          )}
        </div>
      </div>

      {/* ── Target chase banner ── */}
      {isLive && chaseInfo && (
        <div
          className={`rounded-2xl border p-5 ${
            chaseInfo.targetReached
              ? "border-emerald-500/40 bg-emerald-500/10"
              : "border-amber-500/30 bg-amber-500/5"
          }`}
        >
          {chaseInfo.targetReached ? (
            <p className="text-center text-xl font-bold text-emerald-300">
              🎉 Target Reached!
            </p>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-amber-400">
                  Chase
                </p>

                <p className="mt-1 text-2xl font-bold text-white">
                  Need {chaseInfo.runsRequired} run
                  {chaseInfo.runsRequired !== 1
                    ? "s"
                    : ""}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-900 px-4 py-3 text-center">
                  <p className="text-xs text-slate-500">
                    Target
                  </p>
                  <p className="mt-1 text-xl font-bold">
                    {chaseInfo.target}
                  </p>
                </div>

                {chaseInfo.ballsRemaining !== null && (
                  <div className="rounded-xl bg-slate-900 px-4 py-3 text-center">
                    <p className="text-xs text-slate-500">
                      Balls Left
                    </p>
                    <p className="mt-1 text-xl font-bold">
                      {chaseInfo.ballsRemaining}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Current players ── */}
      {isLive && liveState && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            At the Crease
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-950 p-4">
              <p className="text-xs text-emerald-400">
                Striker
              </p>
              <p className="mt-1.5 text-lg font-semibold text-white">
                {liveState.strikerName ?? "—"}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                On strike
              </p>
            </div>

            <div className="rounded-xl bg-slate-950 p-4">
              <p className="text-xs text-slate-400">
                Non-Striker
              </p>
              <p className="mt-1.5 text-lg font-semibold text-white">
                {liveState.nonStrikerName ?? "—"}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                Off strike
              </p>
            </div>

            <div className="rounded-xl bg-slate-950 p-4">
              <p className="text-xs text-blue-400">
                Bowler
              </p>
              <p className="mt-1.5 text-lg font-semibold text-white">
                {liveState.bowlerName ?? "—"}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                Bowling
              </p>
            </div>
          </div>

          {liveState.lastAction && (
            <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3">
              <p className="text-xs text-slate-500">
                Last Ball
              </p>
              <p className="mt-1 font-semibold text-white">
                {liveState.lastAction}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Innings breakdown ── */}
      {innings.length > 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Innings Breakdown
          </p>

          <div className="mt-4 space-y-3">
            {innings
              .slice()
              .sort(
                (a, b) =>
                  a.inningsNumber - b.inningsNumber
              )
              .map((inn) => {
                const battingTeam =
                  inn.battingTeamId ===
                  homeTeam?.id
                    ? homeTeam?.name
                    : awayTeam?.name;

                const bowlingTeam =
                  inn.bowlingTeamId ===
                  homeTeam?.id
                    ? homeTeam?.name
                    : awayTeam?.name;

                const isActive =
                  inn.status === "IN_PROGRESS";

                return (
                  <div
                    key={inn.id}
                    className={`flex flex-col gap-3 rounded-xl p-4 md:flex-row md:items-center md:justify-between ${
                      isActive
                        ? "border border-emerald-500/20 bg-emerald-500/5"
                        : "bg-slate-950"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-3">
                        <p className="font-semibold text-white">
                          Innings{" "}
                          {inn.inningsNumber}
                        </p>

                        {isActive && (
                          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400">
                            Live
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-sm text-slate-400">
                        {battingTeam} bat ·{" "}
                        {bowlingTeam} bowl
                      </p>

                      {inn.target !== null && (
                        <p className="mt-1 text-xs text-amber-400">
                          Target: {inn.target}
                        </p>
                      )}
                    </div>

                    <div className="text-left md:text-right">
                      <p className="text-2xl font-bold tabular-nums text-white">
                        {inn.runs}
                        <span className="text-lg text-slate-500">
                          /{inn.wickets}
                        </span>
                      </p>

                      <p className="mt-0.5 text-xs text-slate-500">
                        {formatOvers(inn.legalBalls)} ov
                        {cricketConfig &&
                          ` of ${cricketConfig.overs}`}
                      </p>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ── Playing XIs ── */}
      {(homeTeam?.squad.length ||
        awayTeam?.squad.length) && (
        <div className="grid gap-6 md:grid-cols-2">
          {[homeTeam, awayTeam]
            .filter(Boolean)
            .map((team) =>
              team && team.squad.length > 0 ? (
                <div
                  key={team.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Playing XI
                  </p>

                  <p className="mt-1 text-lg font-bold">
                    {team.name}
                  </p>

                  <ul className="mt-4 space-y-2">
                    {team.squad.map((player) => (
                      <li
                        key={player.id}
                        className="flex items-center justify-between rounded-lg bg-slate-950 px-4 py-2.5"
                      >
                        <span className="text-sm font-medium text-white">
                          {player.name}
                        </span>

                        {player.jerseyNo !==
                          null && (
                          <span className="text-xs text-slate-500">
                            #{player.jerseyNo}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null
            )}
        </div>
      )}

      {/* ── Fetch error notice ── */}
      {fetchError && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 text-sm text-amber-300">
          ⚠️ Could not refresh live data. Retrying
          automatically…
        </div>
      )}
    </section>
  );
}
