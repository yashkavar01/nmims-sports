import Link from "next/link";
import { notFound } from "next/navigation";

import db from "@/lib/db";

import LiveRefresh from "./LiveRefresh";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

type PlayerInfo = {
  id: string;
  name: string;
  jerseyNo: number | null;
};

type InningsState = {
  inningsId?: string;
  strikerId?: string;
  nonStrikerId?: string;
  bowlerId?: string;
  overNumber?: number;
  legalBalls?: number;
  freeHit?: boolean;
};

function formatOvers(legalBalls: number) {
  return `${Math.floor(legalBalls / 6)}.${legalBalls % 6}`;
}

function formatWicketType(wicketType: string | null) {
  if (!wicketType) {
    return "Wicket";
  }

  return wicketType
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getPlayerName(
  players: Map<string, PlayerInfo>,
  playerId: string | null
) {
  if (!playerId) {
    return "—";
  }

  return players.get(playerId)?.name ?? "Unknown Player";
}

function getDeliveryText(
  delivery: {
    runsOffBat: number;
    totalRuns: number;
    extraType: string | null;
    wicket: boolean;
    wicketType: string | null;
    dismissedPlayerId: string | null;
  },
  players: Map<string, PlayerInfo>
) {
  if (delivery.wicket) {
    const dismissedName = getPlayerName(
      players,
      delivery.dismissedPlayerId
    );

    if (
      delivery.wicketType === "RUN_OUT" &&
      delivery.totalRuns > 0
    ) {
      return `${delivery.totalRuns} run${
        delivery.totalRuns !== 1 ? "s" : ""
      } + ${dismissedName} OUT`;
    }

    return `${dismissedName} OUT — ${formatWicketType(
      delivery.wicketType
    )}`;
  }

  if (delivery.extraType === "NO_BALL") {
    return delivery.runsOffBat > 0
      ? `NO BALL + ${delivery.runsOffBat}`
      : "NO BALL";
  }

  if (delivery.extraType === "WIDE") {
    return `WIDE +${delivery.totalRuns}`;
  }

  if (delivery.extraType === "BYE") {
    return `BYE ${delivery.totalRuns}`;
  }

  if (delivery.extraType === "LEG_BYE") {
    return `LEG BYE ${delivery.totalRuns}`;
  }

  if (delivery.runsOffBat === 0) {
    return "Dot ball";
  }

  if (delivery.runsOffBat === 4) {
    return "FOUR";
  }

  if (delivery.runsOffBat === 6) {
    return "SIX";
  }

  return `${delivery.runsOffBat} run${
    delivery.runsOffBat !== 1 ? "s" : ""
  }`;
}

export default async function LiveMatchPage({
  params,
}: PageProps) {
  const { id } = await params;

  const match = await db.orm.public.Match
    .where({
      id,
    })
    .first();

  if (!match) {
    notFound();
  }

  const liveRefreshEnabled = match.status === "LIVE";

  const [
    sport,
    tournament,
    homeTeam,
    awayTeam,
    config,
    innings,
    matchPlayers,
    allPlayers,
    allUsers,
    matchEvents,
  ] = await Promise.all([
    db.orm.public.Sport
      .where({
        id: match.sportId,
      })
      .first(),

    match.tournamentId
      ? db.orm.public.Tournament
          .where({
            id: match.tournamentId,
          })
          .first()
      : Promise.resolve(null),

    db.orm.public.Team
      .where({
        id: match.homeTeamId,
      })
      .first(),

    db.orm.public.Team
      .where({
        id: match.awayTeamId,
      })
      .first(),

    db.orm.public.CricketMatchConfig
      .where({
        matchId: match.id,
      })
      .first(),

    db.orm.public.CricketInnings
      .where({
        matchId: match.id,
      })
      .all(),

    db.orm.public.MatchPlayer
      .where({
        matchId: match.id,
      })
      .all(),

    db.orm.public.Player.all(),

    db.orm.public.User.all(),

    db.orm.public.MatchEvent
      .where({
        matchId: match.id,
      })
      .all(),
  ]);

  if (!homeTeam || !awayTeam) {
    notFound();
  }

  if (
    !sport ||
    sport.name.toLowerCase() !== "cricket" ||
    !config
  ) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-white md:p-10">
        <div className="mx-auto max-w-6xl">
          <Link
            href={`/matches/${match.id}`}
            className="text-sm text-slate-400 transition hover:text-white"
          >
            ← Back to Match
          </Link>

          <section className="mt-8 rounded-3xl border border-slate-800 bg-slate-900 p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">
              NMIMS Sports Hub
            </p>
            <h1 className="mt-3 text-3xl font-bold">
              Live Match
            </h1>
            <p className="mt-3 text-slate-400">
              Live public scoring is currently available for cricket matches.
            </p>
          </section>
        </div>
      </main>
    );
  }

  const sortedInnings = [...innings].sort(
    (a, b) => a.inningsNumber - b.inningsNumber
  );

  const currentInnings =
    sortedInnings.find(
      (inning) => inning.status === "IN_PROGRESS"
    ) ??
    [...sortedInnings].reverse()[0] ??
    null;

  const playerMap = new Map<string, PlayerInfo>();

  for (const player of allPlayers) {
    const user = allUsers.find(
      (item) => item.id === player.userId
    );

    playerMap.set(player.id, {
      id: player.id,
      name: user?.name ?? "Unknown Player",
      jerseyNo: player.jerseyNo,
    });
  }

  let currentState: InningsState | null = null;

  if (currentInnings) {
    const stateEvents = matchEvents
      .filter((event) => {
        if (!event.data || event.type !== "INNINGS_STATE") {
          return false;
        }

        try {
          const data = JSON.parse(event.data) as InningsState;
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

    if (stateEvents[0]?.data) {
      try {
        currentState = JSON.parse(
          stateEvents[0].data
        ) as InningsState;
      } catch {
        currentState = null;
      }
    }
  }

  const recentDeliveries = currentInnings
    ? await db.orm.public.CricketDelivery
        .where({
          inningsId: currentInnings.id,
        })
        .all()
        .then(async (deliveries) => {
          const overs = await db.orm.public.CricketOver
            .where({
              inningsId: currentInnings.id,
            })
            .all();

          const overNumbers = new Map(
            overs.map((over) => [over.id, over.overNumber])
          );

          return deliveries
            .map((delivery) => ({
              delivery,
              overNumber:
                overNumbers.get(delivery.overId) ?? 0,
            }))
            .sort((a, b) => {
              if (a.overNumber !== b.overNumber) {
                return a.overNumber - b.overNumber;
              }

              return a.delivery.ballNumber - b.delivery.ballNumber;
            })
            .slice(-12)
            .reverse();
        })
    : [];

  const battingTeam = currentInnings
    ? currentInnings.battingTeamId === homeTeam.id
      ? homeTeam
      : awayTeam
    : null;

  const bowlingTeam = currentInnings
    ? currentInnings.bowlingTeamId === homeTeam.id
      ? homeTeam
      : awayTeam
    : null;

  const requiredRuns =
    currentInnings?.target !== null &&
    currentInnings?.target !== undefined
      ? Math.max(
          0,
          currentInnings.target - currentInnings.runs
        )
      : null;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <LiveRefresh enabled={liveRefreshEnabled} />
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Link
              href={`/matches/${match.id}`}
              className="text-sm text-slate-400 transition hover:text-white"
            >
              ← Back to Match
            </Link>

            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.25em] text-emerald-400">
              NMIMS Sports Hub · Live
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
              {homeTeam.name}
              <span className="mx-3 text-slate-600">vs</span>
              {awayTeam.name}
            </h1>

            <div className="mt-3 flex flex-wrap gap-2 text-sm text-slate-500">
              {tournament && <span>{tournament.name}</span>}
              {tournament && match.round && <span>•</span>}
              {match.round && <span>{match.round}</span>}
              {match.matchNumber && <span>•</span>}
              {match.matchNumber && (
                <span>Match #{match.matchNumber}</span>
              )}
              {match.venue && <span>•</span>}
              {match.venue && <span>{match.venue}</span>}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <span
              className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                match.status === "LIVE"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : match.status === "COMPLETED"
                    ? "border-blue-500/30 bg-blue-500/10 text-blue-300"
                    : "border-slate-700 bg-slate-900 text-slate-300"
              }`}
            >
              {match.status === "LIVE"
                ? "● LIVE"
                : match.status}
            </span>

            <Link
              href={`/matches/${match.id}/scorecard`}
              className="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-slate-500 hover:text-white"
            >
              Full Scorecard
            </Link>

            {match.status === "COMPLETED" && (
              <Link
                href={`/matches/${match.id}/result`}
                className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
              >
                Match Result
              </Link>
            )}
          </div>
        </div>

        {!currentInnings ? (
          <section className="mt-8 rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Match Centre
            </p>
            <h2 className="mt-3 text-2xl font-bold">
              Match has not started yet
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Live score will appear here once the first innings begins.
            </p>
          </section>
        ) : (
          <>
            <section className="mt-8 overflow-hidden rounded-3xl border border-slate-800 bg-slate-900">
              <div className="border-b border-slate-800 bg-slate-950/70 px-6 py-5 md:px-8">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
                      Innings {currentInnings.inningsNumber}
                    </p>
                    <h2 className="mt-2 text-xl font-bold">
                      {battingTeam?.name}
                    </h2>
                  </div>

                  <div className="text-left md:text-right">
                    <p className="text-5xl font-black tracking-tight">
                      {currentInnings.runs}/
                      {currentInnings.wickets}
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      {formatOvers(currentInnings.legalBalls)} overs
                    </p>
                  </div>
                </div>

                {currentInnings.target !== null && (
                  <div className="mt-5 flex flex-wrap gap-3 text-sm">
                    <span className="rounded-xl bg-slate-900 px-4 py-3 text-slate-300">
                      Target <strong className="ml-1 text-white">{currentInnings.target}</strong>
                    </span>
                    <span className="rounded-xl bg-slate-900 px-4 py-3 text-slate-300">
                      Required <strong className="ml-1 text-white">{requiredRuns}</strong>
                    </span>
                  </div>
                )}
              </div>

              <div className="grid gap-4 p-6 md:grid-cols-4 md:p-8">
                <div className="rounded-2xl bg-slate-950 p-5">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Overs
                  </p>
                  <p className="mt-2 text-2xl font-bold">
                    {formatOvers(currentInnings.legalBalls)}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-950 p-5">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Run Rate
                  </p>
                  <p className="mt-2 text-2xl font-bold">
                    {currentInnings.legalBalls === 0
                      ? "0.00"
                      : (
                          (currentInnings.runs /
                            currentInnings.legalBalls) *
                          6
                        ).toFixed(2)}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-950 p-5">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Status
                  </p>
                  <p className="mt-2 text-2xl font-bold">
                    {currentInnings.status.replaceAll("_", " ")}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-950 p-5">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Format
                  </p>
                  <p className="mt-2 text-2xl font-bold">
                    {config.format}
                  </p>
                </div>
              </div>
            </section>

            <div className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
              <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6 md:p-8">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Live Players
                    </p>
                    <h2 className="mt-2 text-2xl font-bold">
                      At the crease
                    </h2>
                  </div>

                  {currentState?.freeHit && (
                    <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-300">
                      FREE HIT
                    </span>
                  )}
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Striker
                    </p>
                    <p className="mt-2 text-lg font-bold">
                      {getPlayerName(
                        playerMap,
                        currentState?.strikerId ?? null
                      )}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Non-Striker
                    </p>
                    <p className="mt-2 text-lg font-bold">
                      {getPlayerName(
                        playerMap,
                        currentState?.nonStrikerId ?? null
                      )}
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950 p-5">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Bowler
                  </p>
                  <p className="mt-2 text-lg font-bold">
                    {getPlayerName(
                      playerMap,
                      currentState?.bowlerId ?? null
                    )}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Bowling: {bowlingTeam?.name}
                  </p>
                </div>
              </section>

              <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6 md:p-8">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Match Details
                </p>
                <h2 className="mt-2 text-2xl font-bold">
                  {homeTeam.name} vs {awayTeam.name}
                </h2>

                <div className="mt-6 space-y-4 text-sm">
                  <div className="flex justify-between gap-4 border-b border-slate-800 pb-4">
                    <span className="text-slate-500">Overs</span>
                    <span className="font-semibold text-slate-200">
                      {config.overs}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-slate-800 pb-4">
                    <span className="text-slate-500">Players</span>
                    <span className="font-semibold text-slate-200">
                      {config.playersPerTeam} per team
                    </span>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-slate-800 pb-4">
                    <span className="text-slate-500">Current Over</span>
                    <span className="font-semibold text-slate-200">
                      {currentState?.overNumber ?? "—"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">Status</span>
                    <span className="font-semibold text-slate-200">
                      {match.status}
                    </span>
                  </div>
                </div>

                {match.status === "COMPLETED" && match.result && (
                  <div className="mt-6 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4">
                    <p className="text-xs uppercase tracking-wide text-blue-400">
                      Result
                    </p>
                    <p className="mt-2 font-semibold text-white">
                      {match.result}
                    </p>
                  </div>
                )}
              </section>
            </div>

            <section className="mt-6 rounded-3xl border border-slate-800 bg-slate-900 p-6 md:p-8">
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Ball by Ball
                  </p>
                  <h2 className="mt-2 text-2xl font-bold">
                    Recent Deliveries
                  </h2>
                </div>
                <Link
                  href={`/matches/${match.id}/scorecard`}
                  className="text-sm font-semibold text-blue-400 transition hover:text-blue-300"
                >
                  View Full Scorecard →
                </Link>
              </div>

              {recentDeliveries.length === 0 ? (
                <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950 p-6 text-sm text-slate-500">
                  No deliveries recorded yet.
                </div>
              ) : (
                <div className="mt-6 overflow-hidden rounded-2xl border border-slate-800">
                  <div className="divide-y divide-slate-800">
                    {recentDeliveries.map(
                      ({ delivery, overNumber }) => (
                        <div
                          key={delivery.id}
                          className="grid grid-cols-[56px_1fr_auto] items-center gap-4 bg-slate-950 px-4 py-4"
                        >
                          <span className="inline-flex w-fit rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-bold text-slate-300">
                            {overNumber}.{delivery.ballNumber}
                          </span>

                          <div className="min-w-0">
                            <p className="font-medium text-white">
                              {getDeliveryText(
                                delivery,
                                playerMap
                              )}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {getPlayerName(
                                playerMap,
                                delivery.bowlerId
                              )}
                              {" → "}
                              {getPlayerName(
                                playerMap,
                                delivery.strikerId
                              )}
                            </p>
                          </div>

                          <span className="text-sm font-bold text-slate-300">
                            {delivery.totalRuns}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
            </section>

            {sortedInnings.length > 0 && (
              <section className="mt-6 rounded-3xl border border-slate-800 bg-slate-900 p-6 md:p-8">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Match Progress
                </p>
                <h2 className="mt-2 text-2xl font-bold">
                  Innings Summary
                </h2>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {sortedInnings.map((inning) => {
                    const team =
                      inning.battingTeamId === homeTeam.id
                        ? homeTeam
                        : awayTeam;

                    return (
                      <div
                        key={inning.id}
                        className="rounded-2xl bg-slate-950 p-5"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-xs uppercase tracking-wide text-slate-500">
                              Innings {inning.inningsNumber}
                            </p>
                            <p className="mt-2 font-semibold">
                              {team.name}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold">
                              {inning.runs}/{inning.wickets}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {formatOvers(inning.legalBalls)} overs
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}

        <footer className="mt-8 border-t border-slate-900 pt-5 text-center text-xs text-slate-600">
          NMIMS Sports Hub · Public Match Centre
        </footer>
      </div>
    </main>
  );
}
