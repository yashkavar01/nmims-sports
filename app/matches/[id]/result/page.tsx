import Link from "next/link";
import { notFound } from "next/navigation";

import db from "@/lib/db";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatOvers(legalBalls: number) {
  return `${Math.floor(legalBalls / 6)}.${legalBalls % 6}`;
}

export default async function MatchResultPage({
  params,
}: PageProps) {
  const { id } = await params;

  const match = await db.orm.public.Match.where({ id }).first();

  if (!match) {
    notFound();
  }

  const [sport, tournament, homeTeam, awayTeam, innings] =
    await Promise.all([
      db.orm.public.Sport.where({ id: match.sportId }).first(),
      match.tournamentId
        ? db.orm.public.Tournament
            .where({ id: match.tournamentId })
            .first()
        : Promise.resolve(null),
      db.orm.public.Team.where({ id: match.homeTeamId }).first(),
      db.orm.public.Team.where({ id: match.awayTeamId }).first(),
      db.orm.public.CricketInnings.where({ matchId: match.id }).all(),
    ]);

  if (!sport || !homeTeam || !awayTeam) {
    notFound();
  }

  if (sport.name.toLowerCase() !== "cricket") {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-white md:p-10">
        <div className="mx-auto max-w-5xl">
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
            <h1 className="mt-3 text-3xl font-bold">Match Result</h1>
            <p className="mt-3 text-slate-400">
              The detailed result screen is currently available for cricket matches.
            </p>
          </section>
        </div>
      </main>
    );
  }

  const sortedInnings = [...innings].sort(
    (a, b) => a.inningsNumber - b.inningsNumber
  );

  const completed = match.status === "COMPLETED";
  const winnerName = match.winnerTeamId
    ? match.winnerTeamId === homeTeam.id
      ? homeTeam.name
      : match.winnerTeamId === awayTeam.id
        ? awayTeam.name
        : "Winning Team"
    : null;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href={`/matches/${match.id}/live`}
              className="text-sm text-slate-400 transition hover:text-white"
            >
              ← Back to Match Centre
            </Link>
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.25em] text-blue-400">
              NMIMS Sports Hub · Match Result
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/matches/${match.id}/scorecard`}
              className="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-slate-500 hover:text-white"
            >
              Full Scorecard
            </Link>
            <span
              className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                completed
                  ? "border-blue-500/30 bg-blue-500/10 text-blue-300"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-300"
              }`}
            >
              {completed ? "COMPLETED" : match.status}
            </span>
          </div>
        </div>

        <section className="mt-8 overflow-hidden rounded-3xl border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 bg-slate-950/70 px-6 py-8 text-center md:px-10 md:py-10">
            <p className="text-sm text-slate-500">
              {tournament?.name ?? "NMIMS Sports Hub"}
              {match.round ? ` · ${match.round}` : ""}
            </p>
            <h1 className="mt-4 text-3xl font-black tracking-tight md:text-5xl">
              {homeTeam.name}
              <span className="mx-3 text-slate-600">vs</span>
              {awayTeam.name}
            </h1>
            {match.venue && (
              <p className="mt-3 text-sm text-slate-500">{match.venue}</p>
            )}
          </div>

          <div className="border-b border-slate-800 px-6 py-10 text-center md:px-10">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-400">
              {completed ? "Final Result" : "Match Status"}
            </p>
            {completed && match.result ? (
              <>
                <h2 className="mt-4 text-3xl font-black md:text-4xl">
                  {match.result}
                </h2>
                {winnerName && (
                  <p className="mt-3 text-sm text-slate-400">
                    Winning team: <span className="font-semibold text-slate-200">{winnerName}</span>
                  </p>
                )}
              </>
            ) : (
              <h2 className="mt-4 text-3xl font-black md:text-4xl">
                {match.status === "LIVE" ? "Match in Progress" : "Result Not Available Yet"}
              </h2>
            )}
          </div>

          <div className="p-6 md:p-10">
            <div className="grid gap-5 md:grid-cols-2">
              {sortedInnings.map((inning) => {
                const team =
                  inning.battingTeamId === homeTeam.id ? homeTeam : awayTeam;

                return (
                  <div
                    key={inning.id}
                    className="rounded-2xl border border-slate-800 bg-slate-950 p-6"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Innings {inning.inningsNumber}
                        </p>
                        <h3 className="mt-2 text-xl font-bold">{team.name}</h3>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-black">
                          {inning.runs}/{inning.wickets}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {formatOvers(inning.legalBalls)} overs
                        </p>
                      </div>
                    </div>

                    {inning.target !== null && (
                      <div className="mt-5 rounded-xl bg-slate-900 px-4 py-3 text-sm text-slate-400">
                        Target: <span className="font-semibold text-white">{inning.target}</span>
                      </div>
                    )}

                    <div className="mt-4 flex items-center justify-between text-sm">
                      <span className="text-slate-500">Status</span>
                      <span className="font-semibold text-slate-300">
                        {inning.status.replaceAll("_", " ")}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {sortedInnings.length === 0 && (
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-8 text-center text-slate-500">
                No innings have been recorded for this match yet.
              </div>
            )}

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href={`/matches/${match.id}/scorecard`}
                className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
              >
                View Complete Scorecard
              </Link>
              <Link
                href={`/matches/${match.id}/live`}
                className="rounded-xl border border-slate-700 bg-slate-900 px-6 py-3 text-sm font-semibold text-slate-300 transition hover:border-slate-500 hover:text-white"
              >
                Open Match Centre
              </Link>
            </div>
          </div>
        </section>

        <footer className="mt-8 border-t border-slate-900 pt-5 text-center text-xs text-slate-600">
          NMIMS Sports Hub · Official Match Result
        </footer>
      </div>
    </main>
  );
}
