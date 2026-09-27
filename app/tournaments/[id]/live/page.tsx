import Link from "next/link";

import db from "../../../../lib/db";

type TournamentLivePageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatDateTime(value: unknown) {
  if (!value) {
    return "Time not set";
  }

  const epochMilliseconds =
    typeof value === "object" &&
    value !== null &&
    "epochMilliseconds" in value &&
    typeof value.epochMilliseconds === "number"
      ? value.epochMilliseconds
      : null;

  if (epochMilliseconds === null) {
    return "Time not set";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(epochMilliseconds));
}

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

  if (epochMilliseconds === null) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
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

export default async function TournamentLivePage({
  params,
}: TournamentLivePageProps) {
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
            className="mt-6 inline-flex rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium transition hover:bg-slate-800"
          >
            ← Back to Tournaments
          </Link>
        </div>
      </main>
    );
  }

  const [sport, matches, teams, innings] = await Promise.all([
    db.orm.public.Sport
      .where({ id: tournament.sportId })
      .first(),

    db.orm.public.Match
      .where({ tournamentId: tournament.id })
      .all(),

    db.orm.public.Team.all(),

    db.orm.public.CricketInnings.all(),
  ]);

  const teamMap = new Map(
    teams.map((team) => [team.id, team.name])
  );

  const inningsByMatch = new Map<
    string,
    typeof innings
  >();

  for (const inning of innings) {
    const existing =
      inningsByMatch.get(inning.matchId) ?? [];

    existing.push(inning);
    inningsByMatch.set(
      inning.matchId,
      existing
    );
  }

  const sortedMatches = [...matches].sort(
    (a, b) => {
      const aTime =
        a.scheduledAt &&
        typeof a.scheduledAt === "object" &&
        "epochMilliseconds" in a.scheduledAt &&
        typeof a.scheduledAt.epochMilliseconds === "number"
          ? a.scheduledAt.epochMilliseconds
          : Number.MAX_SAFE_INTEGER;

      const bTime =
        b.scheduledAt &&
        typeof b.scheduledAt === "object" &&
        "epochMilliseconds" in b.scheduledAt &&
        typeof b.scheduledAt.epochMilliseconds === "number"
          ? b.scheduledAt.epochMilliseconds
          : Number.MAX_SAFE_INTEGER;

      if (aTime !== bTime) {
        return aTime - bTime;
      }

      return (
        (a.matchNumber ?? Number.MAX_SAFE_INTEGER) -
        (b.matchNumber ?? Number.MAX_SAFE_INTEGER)
      );
    }
  );

  const liveMatches = sortedMatches.filter(
    (match) => match.status === "LIVE"
  );

  const upcomingMatches = sortedMatches.filter(
    (match) =>
      match.status !== "LIVE" &&
      match.status !== "COMPLETED" &&
      match.status !== "CANCELLED"
  );

  const completedMatches = sortedMatches.filter(
    (match) => match.status === "COMPLETED"
  );

  const getTeamName = (teamId: string) =>
    teamMap.get(teamId) ?? "Unknown Team";

  const renderScore = (matchId: string) => {
    const matchInnings =
      inningsByMatch.get(matchId) ?? [];

    if (matchInnings.length === 0) {
      return null;
    }

    return (
      <div className="mt-5 space-y-2">
        {matchInnings
          .slice()
          .sort(
            (a, b) =>
              a.inningsNumber - b.inningsNumber
          )
          .map((inning) => (
            <div
              key={inning.id}
              className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 px-4 py-3"
            >
              <div>
                <p className="text-xs text-slate-500">
                  Innings {inning.inningsNumber}
                </p>

                <p className="mt-1 text-sm font-medium text-slate-300">
                  {getTeamName(
                    inning.battingTeamId
                  )}
                </p>
              </div>

              <div className="text-right">
                <p className="text-lg font-bold">
                  {inning.runs}/{inning.wickets}
                </p>

                <p className="text-xs text-slate-500">
                  {inning.legalBalls} balls
                </p>
              </div>
            </div>
          ))}
      </div>
    );
  };

  const renderMatchCard = (
    match: (typeof sortedMatches)[number]
  ) => {
    const homeTeam = getTeamName(
      match.homeTeamId
    );

    const awayTeam = getTeamName(
      match.awayTeamId
    );

    return (
      <article
        key={match.id}
        className="rounded-xl border border-slate-800 bg-slate-900 p-6"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClasses(
                  match.status
                )}`}
              >
                {getStatusLabel(match.status)}
              </span>

              {match.matchNumber !== null &&
                match.matchNumber !== undefined && (
                  <span className="text-xs text-slate-500">
                    Match #{match.matchNumber}
                  </span>
                )}

              {match.round && (
                <span className="text-xs text-slate-500">
                  {match.round}
                </span>
              )}
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
              <div>
                <p className="text-lg font-semibold">
                  {homeTeam}
                </p>
              </div>

              <div className="text-sm font-semibold text-slate-500">
                VS
              </div>

              <div className="sm:text-right">
                <p className="text-lg font-semibold">
                  {awayTeam}
                </p>
              </div>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <p className="text-xs text-slate-500">
              {match.scheduledAt
                ? formatDateTime(
                    match.scheduledAt
                  )
                : "Schedule not set"}
            </p>

            {match.venue && (
              <p className="mt-1 text-xs text-slate-500">
                {match.venue}
              </p>
            )}
          </div>
        </div>

        {renderScore(match.id)}

        {match.result && (
          <div className="mt-5 rounded-lg border border-slate-800 bg-slate-950 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Result
            </p>

            <p className="mt-1 text-sm font-semibold text-slate-200">
              {match.result}
            </p>
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-3">
          {match.status === "LIVE" && (
            <Link
              href={`/matches/${match.id}/live`}
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
            >
              Watch Live →
            </Link>
          )}

          {match.status === "COMPLETED" && (
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
  };

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
              Tournament Live Centre
            </h1>

            <p className="mt-2 text-slate-400">
              {tournament.name}
              {sport?.name
                ? ` · ${sport.name}`
                : ""}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 px-5 py-4">
            <p className="text-xs text-slate-500">
              Tournament Dates
            </p>

            <p className="mt-1 text-sm font-medium text-slate-300">
              {formatDate(tournament.startDate)} —{" "}
              {formatDate(tournament.endDate)}
            </p>
          </div>
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
              className="border-b-2 border-white px-5 py-4 text-sm font-semibold text-white"
            >
              Live Centre
            </Link>

            <Link
              href={`/tournaments/${tournament.id}/fixtures`}
              className="px-5 py-4 text-sm font-medium text-slate-400 transition hover:text-white"
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
              Live Matches
            </p>

            <p className="mt-2 text-3xl font-bold text-white">
              {liveMatches.length}
            </p>
          </div>

          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-5">
            <p className="text-sm text-slate-400">
              Upcoming
            </p>

            <p className="mt-2 text-3xl font-bold text-white">
              {upcomingMatches.length}
            </p>
          </div>

          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
            <p className="text-sm text-slate-400">
              Completed
            </p>

            <p className="mt-2 text-3xl font-bold text-white">
              {completedMatches.length}
            </p>
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-4">
            <h2 className="text-xl font-semibold">
              Live Now
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Matches currently being played.
            </p>
          </div>

          {liveMatches.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/50 p-10 text-center">
              <p className="font-medium text-slate-300">
                No live matches right now.
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Upcoming and completed matches are shown
                below.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {liveMatches.map(renderMatchCard)}
            </div>
          )}
        </section>

        <section className="mt-10">
          <div className="mb-4">
            <h2 className="text-xl font-semibold">
              Upcoming Matches
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Scheduled matches in this tournament.
            </p>
          </div>

          {upcomingMatches.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/50 p-10 text-center">
              <p className="text-sm text-slate-500">
                No upcoming matches.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingMatches.map(renderMatchCard)}
            </div>
          )}
        </section>

        <section className="mt-10">
          <div className="mb-4">
            <h2 className="text-xl font-semibold">
              Recent Results
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Completed tournament matches.
            </p>
          </div>

          {completedMatches.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/50 p-10 text-center">
              <p className="text-sm text-slate-500">
                No completed matches yet.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {completedMatches.map(renderMatchCard)}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}