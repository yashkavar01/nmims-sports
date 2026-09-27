import Link from "next/link";

import db from "../../../../lib/db";

type TournamentFixturesPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function getEpochMilliseconds(value: unknown) {
  if (
    typeof value === "object" &&
    value !== null &&
    "epochMilliseconds" in value &&
    typeof value.epochMilliseconds === "number"
  ) {
    return value.epochMilliseconds;
  }

  return null;
}

function formatTime(value: unknown) {
  const epochMilliseconds =
    getEpochMilliseconds(value);

  if (epochMilliseconds === null) {
    return "Time TBD";
  }

  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(epochMilliseconds));
}

function getStatusLabel(status: string) {
  if (status === "LIVE") {
    return "LIVE";
  }

  if (status === "COMPLETED") {
    return "COMPLETED";
  }

  if (status === "CANCELLED") {
    return "CANCELLED";
  }

  return "UPCOMING";
}

function getStatusClasses(status: string) {
  if (status === "LIVE") {
    return "border-red-500/30 bg-red-500/10 text-red-300";
  }

  if (status === "COMPLETED") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  }

  if (status === "CANCELLED") {
    return "border-slate-700 bg-slate-800 text-slate-400";
  }

  return "border-blue-500/30 bg-blue-500/10 text-blue-300";
}

export default async function TournamentFixturesPage({
  params,
}: TournamentFixturesPageProps) {
  const { id } = await params;

  const tournament = await db.orm.public.Tournament
    .where({ id })
    .first();

  if (!tournament) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-white md:p-10">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm text-slate-400">
            NMIMS Sports Hub
          </p>

          <h1 className="mt-3 text-3xl font-bold">
            Tournament not found
          </h1>

          <p className="mt-2 text-slate-400">
            The tournament you are looking for does not exist.
          </p>

          <Link
            href="/tournaments"
            className="mt-6 inline-flex rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            ← Back to Tournaments
          </Link>
        </div>
      </main>
    );
  }

  const [sport, matches, teams] = await Promise.all([
    db.orm.public.Sport
      .where({ id: tournament.sportId })
      .first(),

    db.orm.public.Match
      .where({ tournamentId: tournament.id })
      .all(),

    db.orm.public.Team.all(),
  ]);

  const teamMap = new Map(
    teams.map((team) => [team.id, team.name])
  );

  const sortedMatches = [...matches].sort(
    (a, b) => {
      const aTime =
        getEpochMilliseconds(
          a.scheduledAt
        );

      const bTime =
        getEpochMilliseconds(
          b.scheduledAt
        );

      if (
        aTime !== null &&
        bTime !== null
      ) {
        if (aTime !== bTime) {
          return aTime - bTime;
        }
      }

      if (
        aTime !== null &&
        bTime === null
      ) {
        return -1;
      }

      if (
        aTime === null &&
        bTime !== null
      ) {
        return 1;
      }

      return (
        (a.matchNumber ??
          Number.MAX_SAFE_INTEGER) -
        (b.matchNumber ??
          Number.MAX_SAFE_INTEGER)
      );
    }
  );

  const liveCount = matches.filter(
    (match) => match.status === "LIVE"
  ).length;

  const upcomingCount = matches.filter(
    (match) =>
      match.status !== "LIVE" &&
      match.status !== "COMPLETED" &&
      match.status !== "CANCELLED"
  ).length;

  const completedCount = matches.filter(
    (match) => match.status === "COMPLETED"
  ).length;

  const groupedFixtures = new Map<
    string,
    typeof sortedMatches
  >();

  for (const match of sortedMatches) {
    const epochMilliseconds =
      getEpochMilliseconds(
        match.scheduledAt
      );

    const groupKey =
      epochMilliseconds !== null
        ? new Intl.DateTimeFormat("en-CA", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).format(
            new Date(epochMilliseconds)
          )
        : "TBD";

    const existing =
      groupedFixtures.get(groupKey) ?? [];

    existing.push(match);
    groupedFixtures.set(
      groupKey,
      existing
    );
  }

  const getTeamName = (teamId: string) =>
    teamMap.get(teamId) ?? "Unknown Team";

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white md:p-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <Link
              href={`/tournaments/${tournament.id}`}
              className="text-sm text-slate-400 transition hover:text-white"
            >
              ← {tournament.name}
            </Link>

            <p className="mt-5 text-sm text-slate-400">
              NMIMS Sports Hub
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              Tournament Fixtures
            </h1>

            <p className="mt-2 text-slate-400">
              {tournament.name}
              {sport?.name
                ? ` · ${sport.name}`
                : ""}
            </p>
          </div>

          <Link
            href={`/tournaments/${tournament.id}/live`}
            className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Open Live Centre →
          </Link>
        </div>

        <nav className="mt-8 overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
          <div className="flex min-w-max">
            <Link
              href={`/tournaments/${tournament.id}`}
              className="px-5 py-4 text-sm font-medium text-slate-400 transition hover:text-white"
            >
              Overview
            </Link>

            <Link
              href={`/tournaments/${tournament.id}/live`}
              className="px-5 py-4 text-sm font-medium text-slate-400 transition hover:text-white"
            >
              Live Centre
            </Link>

            <Link
              href={`/tournaments/${tournament.id}/fixtures`}
              className="border-b-2 border-white px-5 py-4 text-sm font-semibold text-white"
            >
              Fixtures
            </Link>

            <Link
              href={`/tournaments/${tournament.id}/standings`}
              className="px-5 py-4 text-sm font-medium text-slate-400 transition hover:text-white"
            >
              Standings
            </Link>

            <span className="px-5 py-4 text-sm font-medium text-slate-600">
              Results
            </span>

            <span className="px-5 py-4 text-sm font-medium text-slate-600">
              Teams
            </span>
          </div>
        </nav>

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5">
            <p className="text-sm text-slate-400">
              Live
            </p>

            <p className="mt-2 text-3xl font-bold">
              {liveCount}
            </p>
          </div>

          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-5">
            <p className="text-sm text-slate-400">
              Upcoming
            </p>

            <p className="mt-2 text-3xl font-bold">
              {upcomingCount}
            </p>
          </div>

          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
            <p className="text-sm text-slate-400">
              Completed
            </p>

            <p className="mt-2 text-3xl font-bold">
              {completedCount}
            </p>
          </div>
        </section>

        {sortedMatches.length === 0 ? (
          <section className="mt-8 rounded-xl border border-dashed border-slate-800 bg-slate-900/50 p-12 text-center">
            <div className="mx-auto max-w-md">
              <h2 className="text-xl font-semibold">
                No fixtures yet
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Matches created for this tournament will
                automatically appear here.
              </p>
            </div>
          </section>
        ) : (
          <section className="mt-8 space-y-10">
            {Array.from(
              groupedFixtures.entries()
            ).map(
              ([groupKey, groupMatches]) => {
                const firstMatch =
                  groupMatches[0];

                const firstMatchTime =
                  getEpochMilliseconds(
                    firstMatch?.scheduledAt
                  );

                const heading =
                  groupKey === "TBD"
                    ? "Schedule to be announced"
                    : firstMatchTime !== null
                      ? new Intl.DateTimeFormat(
                          "en-IN",
                          {
                            weekday: "long",
                            day: "2-digit",
                            month: "long",
                            year: "numeric",
                          }
                        ).format(
                          new Date(
                            firstMatchTime
                          )
                        )
                      : "Schedule to be announced";

                return (
                  <div key={groupKey}>
                    <div className="mb-4 flex items-end justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-semibold">
                          {heading}
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                          {groupMatches.length}{" "}
                          {groupMatches.length === 1
                            ? "fixture"
                            : "fixtures"}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {groupMatches.map(
                        (match) => {
                          const homeTeam =
                            getTeamName(
                              match.homeTeamId
                            );

                          const awayTeam =
                            getTeamName(
                              match.awayTeamId
                            );

                          return (
                            <article
                              key={match.id}
                              className="rounded-xl border border-slate-800 bg-slate-900 p-5 transition hover:border-slate-700"
                            >
                              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-3">
                                    <span
                                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClasses(
                                        match.status
                                      )}`}
                                    >
                                      {getStatusLabel(
                                        match.status
                                      )}
                                    </span>

                                    {match.matchNumber !==
                                      null &&
                                      match.matchNumber !==
                                        undefined && (
                                        <span className="text-xs text-slate-500">
                                          Match #
                                          {match.matchNumber}
                                        </span>
                                      )}

                                    {match.round && (
                                      <span className="text-xs text-slate-500">
                                        {match.round}
                                      </span>
                                    )}
                                  </div>

                                  <div className="mt-5 grid items-center gap-4 sm:grid-cols-[1fr_auto_1fr]">
                                    <div>
                                      <p className="text-lg font-semibold">
                                        {homeTeam}
                                      </p>

                                      <p className="mt-1 text-xs text-slate-500">
                                        Home
                                      </p>
                                    </div>

                                    <div className="hidden text-xs font-semibold text-slate-600 sm:block">
                                      VS
                                    </div>

                                    <div className="sm:text-right">
                                      <p className="text-lg font-semibold">
                                        {awayTeam}
                                      </p>

                                      <p className="mt-1 text-xs text-slate-500">
                                        Away
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                <div className="border-t border-slate-800 pt-4 lg:w-56 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
                                  <p className="text-sm font-medium text-slate-300">
                                    {match.scheduledAt
                                      ? formatTime(
                                          match.scheduledAt
                                        )
                                      : "Time TBD"}
                                  </p>

                                  {match.venue && (
                                    <p className="mt-1 text-xs text-slate-500">
                                      {match.venue}
                                    </p>
                                  )}

                                  {match.result && (
                                    <p className="mt-3 text-sm font-medium text-emerald-300">
                                      {match.result}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="mt-5 flex flex-wrap gap-3 border-t border-slate-800 pt-4">
                                {match.status ===
                                  "LIVE" && (
                                  <Link
                                    href={`/matches/${match.id}/live`}
                                    className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
                                  >
                                    Watch Live →
                                  </Link>
                                )}

                                {match.status ===
                                  "COMPLETED" && (
                                  <Link
                                    href={`/matches/${match.id}/result`}
                                    className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
                                  >
                                    View Result →
                                  </Link>
                                )}

                                <Link
                                  href={`/matches/${match.id}/scorecard`}
                                  className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
                                >
                                  Scorecard
                                </Link>

                                <Link
                                  href={`/matches/${match.id}`}
                                  className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
                                >
                                  Match Details
                                </Link>
                              </div>
                            </article>
                          );
                        }
                      )}
                    </div>
                  </div>
                );
              }
            )}
          </section>
        )}
      </div>
    </main>
  );
}