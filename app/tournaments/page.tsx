import Link from "next/link";

import db from "../../lib/db";
import CreateTournamentForm from "./CreateTournamentForm";

function formatDate(value: unknown) {
  if (!value) {
    return "Not set";
  }

  const epochMilliseconds =
    typeof value === "object" &&
    value !== null &&
    "epochMilliseconds" in value &&
    typeof value.epochMilliseconds === "number"
      ? value.epochMilliseconds
      : null;

  if (epochMilliseconds !== null) {
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(epochMilliseconds));
  }

  const parsed = new Date(String(value));

  if (Number.isNaN(parsed.getTime())) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

export default async function TournamentsPage() {
  const [tournaments, sports] = await Promise.all([
    db.orm.public.Tournament.all(),
    db.orm.public.Sport.all(),
  ]);

  const sportMap = new Map(
    sports.map((sport) => [sport.id, sport.name])
  );

  const sortedTournaments = [...tournaments].sort((a, b) => {
    const aTime =
      a.startDate &&
      typeof a.startDate === "object" &&
      "epochMilliseconds" in a.startDate &&
      typeof a.startDate.epochMilliseconds === "number"
        ? a.startDate.epochMilliseconds
        : Number.MAX_SAFE_INTEGER;

    const bTime =
      b.startDate &&
      typeof b.startDate === "object" &&
      "epochMilliseconds" in b.startDate &&
      typeof b.startDate.epochMilliseconds === "number"
        ? b.startDate.epochMilliseconds
        : Number.MAX_SAFE_INTEGER;

    return aTime - bTime;
  });

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white md:p-10">
      <div className="mx-auto max-w-6xl">
        <p className="text-sm text-slate-400">
          NMIMS Sports Hub
        </p>

        <div className="mt-2 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              Tournaments
            </h1>

            <p className="mt-2 text-slate-400">
              Manage tournaments across all sports.
            </p>
          </div>

          <CreateTournamentForm sports={sports} />
        </div>

        <div className="mt-8">
          {sortedTournaments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/50 p-12 text-center">
              <p className="text-lg font-medium">
                No tournaments created yet.
              </p>

              <p className="mt-2 text-sm text-slate-400">
                Create your first tournament to get started.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {sortedTournaments.map((tournament) => (
                <Link
                  key={tournament.id}
                  href={`/tournaments/${tournament.id}`}
                  className="group block rounded-xl border border-slate-800 bg-slate-900 p-6 transition hover:-translate-y-0.5 hover:border-slate-700 hover:bg-slate-800"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-semibold transition group-hover:text-white">
                        {tournament.name}
                      </h2>

                      <p className="mt-2 text-sm text-slate-400">
                        {sportMap.get(tournament.sportId) ??
                          "Sport not specified"}
                      </p>
                    </div>

                    <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs font-medium text-slate-300">
                      Tournament
                    </span>
                  </div>

                  <div className="mt-6 space-y-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-500">
                        Start
                      </span>

                      <span className="font-medium text-slate-300">
                        {formatDate(tournament.startDate)}
                      </span>
                    </div>

                    <div className="flex justify-between gap-4">
                      <span className="text-slate-500">
                        End
                      </span>

                      <span className="font-medium text-slate-300">
                        {formatDate(tournament.endDate)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 border-t border-slate-800 pt-4">
                    <span className="text-sm font-semibold text-white">
                      Open Tournament →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}