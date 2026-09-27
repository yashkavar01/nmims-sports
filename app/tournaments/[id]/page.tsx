import Link from "next/link";

import db from "../../../lib/db";

type TournamentPageProps = {
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

  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
}

function formatDate(value: unknown) {
  const epochMilliseconds = getEpochMilliseconds(value);

  if (epochMilliseconds === null) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(epochMilliseconds));
}

function formatDateTime(value: unknown) {
  const epochMilliseconds = getEpochMilliseconds(value);

  if (epochMilliseconds === null) {
    return "Time not set";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(epochMilliseconds));
}

function formatOvers(legalBalls: number) {
  const overs = Math.floor(legalBalls / 6);
  const balls = legalBalls % 6;

  return `${overs}.${balls}`;
}

function getTournamentStatus(
  liveCount: number,
  upcomingCount: number,
  completedCount: number,
) {
  if (liveCount > 0) {
    return {
      label: "LIVE",
      description: "Matches are currently in progress",
      className:
        "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    };
  }

  if (upcomingCount > 0) {
    return {
      label: completedCount > 0 ? "ACTIVE" : "UPCOMING",
      description:
        completedCount > 0
          ? "Tournament fixtures are currently active"
          : "Fixtures are scheduled",
      className: "border-blue-500/30 bg-blue-500/10 text-blue-300",
    };
  }

  if (completedCount > 0) {
    return {
      label: "COMPLETED",
      description: "All scheduled matches have finished",
      className: "border-slate-600 bg-slate-800 text-slate-300",
    };
  }

  return {
    label: "NOT STARTED",
    description: "Tournament fixtures are not available yet",
    className: "border-slate-700 bg-slate-900 text-slate-400",
  };
}

export default async function TournamentPage({
  params,
}: TournamentPageProps) {
  const { id } = await params;

  const tournament = await db.orm.public.Tournament.where({ id }).first();

  if (!tournament) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-white md:p-10">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm text-slate-400">NMIMS Sports Hub</p>

          <h1 className="mt-3 text-3xl font-bold">Tournament not found</h1>

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

  const [
    sport,
    registrations,
    matches,
    allTeams,
    allInnings,
  ] = await Promise.all([
    db.orm.public.Sport.where({ id: tournament.sportId }).first(),

    db.orm.public.TournamentTeam.where({
      tournamentId: tournament.id,
    }).all(),

    db.orm.public.Match.where({
      tournamentId: tournament.id,
    }).all(),

    db.orm.public.Team.all(),

    db.orm.public.CricketInnings.all(),
  ]);

  const teamMap = new Map(allTeams.map((team) => [team.id, team]));

  const registeredTeams = registrations
    .map((registration) => teamMap.get(registration.teamId))
    .filter((team): team is NonNullable<typeof team> => team !== undefined);

  const liveMatches = matches.filter((match) => match.status === "LIVE");

  const completedMatches = matches.filter(
    (match) => match.status === "COMPLETED",
  );

  const scheduledMatches = matches.filter(
    (match) =>
      match.status !== "LIVE" &&
      match.status !== "COMPLETED" &&
      match.status !== "CANCELLED",
  );

  const cancelledMatches = matches.filter(
    (match) => match.status === "CANCELLED",
  );

  const tournamentStatus = getTournamentStatus(
    liveMatches.length,
    scheduledMatches.length,
    completedMatches.length,
  );

  const sortedMatches = [...matches].sort((a, b) => {
    const aTime = getEpochMilliseconds(a.scheduledAt);
    const bTime = getEpochMilliseconds(b.scheduledAt);

    if (aTime !== null && bTime !== null) {
      return aTime - bTime;
    }

    if (aTime !== null) {
      return -1;
    }

    if (bTime !== null) {
      return 1;
    }

    return (a.matchNumber ?? 0) - (b.matchNumber ?? 0);
  });

  const upcomingPreview = sortedMatches
    .filter(
      (match) =>
        match.status !== "LIVE" &&
        match.status !== "COMPLETED" &&
        match.status !== "CANCELLED",
    )
    .slice(0, 3);

  const recentResults = [...completedMatches]
    .sort((a, b) => {
      const aTime = getEpochMilliseconds(a.scheduledAt);
      const bTime = getEpochMilliseconds(b.scheduledAt);

      if (aTime !== null && bTime !== null) {
        return bTime - aTime;
      }

      if (aTime !== null) {
        return -1;
      }

      if (bTime !== null) {
        return 1;
      }

      return (b.matchNumber ?? 0) - (a.matchNumber ?? 0);
    })
    .slice(0, 3);

  const inningsByMatch = new Map<
    string,
    typeof allInnings
  >();

  for (const innings of allInnings) {
    if (!inningsByMatch.has(innings.matchId)) {
      inningsByMatch.set(innings.matchId, []);
    }

    inningsByMatch.get(innings.matchId)!.push(innings);
  }

  for (const innings of inningsByMatch.values()) {
    innings.sort((a, b) => a.inningsNumber - b.inningsNumber);
  }

  const standings = registeredTeams.map((team) => {
    let played = 0;
    let wins = 0;
    let losses = 0;
    let ties = 0;

    for (const match of completedMatches) {
      const involvesTeam =
        match.homeTeamId === team.id || match.awayTeamId === team.id;

      if (!involvesTeam) {
        continue;
      }

      played += 1;

      if (match.winnerTeamId === team.id) {
        wins += 1;
        continue;
      }

      if (match.winnerTeamId === null && match.result === "Match tied") {
        ties += 1;
        continue;
      }

      losses += 1;
    }

    const points = wins * 2 + ties;

    return {
      team,
      played,
      wins,
      losses,
      ties,
      points,
    };
  });

  standings.sort((a, b) => {
    if (b.points !== a.points) {
      return b.points - a.points;
    }

    if (b.wins !== a.wins) {
      return b.wins - a.wins;
    }

    if (b.played !== a.played) {
      return b.played - a.played;
    }

    return a.team.name.localeCompare(b.team.name);
  });

  const standingsPreview = standings.slice(0, 5);

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white md:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <Link
              href="/tournaments"
              className="text-sm text-slate-400 transition hover:text-white"
            >
              ← All Tournaments
            </Link>

            <p className="mt-5 text-sm text-slate-400">NMIMS Sports Hub</p>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold md:text-4xl">
                {tournament.name}
              </h1>

              <span
                className={`rounded-full border px-3 py-1 text-xs font-bold tracking-wide ${tournamentStatus.className}`}
              >
                {tournamentStatus.label}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-medium text-slate-300">
                {sport?.name ?? "Sport"}
              </span>

              <span className="text-sm text-slate-400">
                {registeredTeams.length} teams
              </span>

              <span className="text-sm text-slate-400">
                {matches.length} matches
              </span>

              <span className="text-sm text-slate-500">
                {tournamentStatus.description}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-400">
              <span>
                <span className="text-slate-500">Start:</span>{" "}
                {formatDate(tournament.startDate)}
              </span>

              <span>
                <span className="text-slate-500">End:</span>{" "}
                {formatDate(tournament.endDate)}
              </span>
            </div>
          </div>

          <Link
            href={`/tournaments/${tournament.id}/live`}
            className="inline-flex items-center justify-center rounded-lg bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
          >
            Open Live Centre →
          </Link>
        </div>

        <nav className="mt-8 overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
          <div className="flex min-w-max">
            <Link
              href={`/tournaments/${tournament.id}`}
              className="border-b-2 border-white px-5 py-4 text-sm font-semibold text-white"
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

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Teams</p>
            <p className="mt-2 text-3xl font-bold">
              {registeredTeams.length}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Total Matches</p>
            <p className="mt-2 text-3xl font-bold">{matches.length}</p>
          </div>

          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
            <p className="text-sm text-emerald-300">Live</p>
            <p className="mt-2 text-3xl font-bold text-white">
              {liveMatches.length}
            </p>
          </div>

          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-5">
            <p className="text-sm text-blue-300">Upcoming</p>
            <p className="mt-2 text-3xl font-bold text-white">
              {scheduledMatches.length}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Completed</p>
            <p className="mt-2 text-3xl font-bold">
              {completedMatches.length}
            </p>
          </div>
        </section>

        {liveMatches.length > 0 && (
          <section className="mt-8">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
                  Live Now
                </p>
                <h2 className="mt-1 text-2xl font-bold">
                  Matches in progress
                </h2>
              </div>

              <Link
                href={`/tournaments/${tournament.id}/live`}
                className="text-sm font-semibold text-slate-300 transition hover:text-white"
              >
                View all live matches →
              </Link>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              {liveMatches.slice(0, 2).map((match) => {
                const homeTeam = teamMap.get(match.homeTeamId);
                const awayTeam = teamMap.get(match.awayTeamId);
                const innings = inningsByMatch.get(match.id) ?? [];

                return (
                  <div
                    key={match.id}
                    className="overflow-hidden rounded-2xl border border-emerald-500/20 bg-slate-900"
                  >
                    <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                          Live Match
                        </p>

                        <p className="mt-1 text-sm text-slate-400">
                          {match.round ?? "Tournament Match"}
                          {match.matchNumber
                            ? ` • Match ${match.matchNumber}`
                            : ""}
                        </p>
                      </div>

                      <span className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-300">
                        <span className="h-2 w-2 rounded-full bg-emerald-400" />
                        LIVE
                      </span>
                    </div>

                    <div className="grid gap-4 p-5">
                      <div className="grid grid-cols-[1fr_auto] items-center gap-4 rounded-xl border border-slate-800 bg-slate-950 p-4">
                        <div>
                          <p className="font-semibold">
                            {homeTeam?.name ?? "Home Team"}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            Home
                          </p>
                        </div>

                        {(() => {
                          const homeInnings = innings
                            .filter(
                              (inning) => inning.battingTeamId === match.homeTeamId,
                            )
                            .at(-1);

                          if (!homeInnings) {
                            return (
                              <span className="text-sm text-slate-500">
                                —
                              </span>
                            );
                          }

                          return (
                            <div className="text-right">
                              <p className="text-xl font-bold">
                                {homeInnings.runs}/{homeInnings.wickets}
                              </p>

                              <p className="text-xs text-slate-500">
                                {formatOvers(homeInnings.legalBalls)} overs
                              </p>
                            </div>
                          );
                        })()}
                      </div>

                      <div className="grid grid-cols-[1fr_auto] items-center gap-4 rounded-xl border border-slate-800 bg-slate-950 p-4">
                        <div>
                          <p className="font-semibold">
                            {awayTeam?.name ?? "Away Team"}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            Away
                          </p>
                        </div>

                        {(() => {
                          const awayInnings = innings
                            .filter(
                              (inning) => inning.battingTeamId === match.awayTeamId,
                            )
                            .at(-1);

                          if (!awayInnings) {
                            return (
                              <span className="text-sm text-slate-500">
                                —
                              </span>
                            );
                          }

                          return (
                            <div className="text-right">
                              <p className="text-xl font-bold">
                                {awayInnings.runs}/{awayInnings.wickets}
                              </p>

                              <p className="text-xs text-slate-500">
                                {formatOvers(awayInnings.legalBalls)} overs
                              </p>
                            </div>
                          );
                        })()}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="text-sm text-slate-500">
                          {match.venue ?? "Venue not set"}
                        </div>

                        <Link
                          href={`/matches/${match.id}/live`}
                          className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
                        >
                          Watch Live →
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="mt-8 grid gap-5 lg:grid-cols-3">
          <Link
            href={`/tournaments/${tournament.id}/live`}
            className="rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:border-emerald-500/30 hover:bg-slate-800"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Live Centre</h2>
              <span className="text-xl">→</span>
            </div>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Follow live matches, scores, wickets, overs and match status.
            </p>

            <p className="mt-5 text-sm font-semibold text-white">
              {liveMatches.length} live{" "}
              {liveMatches.length === 1 ? "match" : "matches"}
            </p>
          </Link>

          <Link
            href={`/tournaments/${tournament.id}/fixtures`}
            className="rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:border-blue-500/30 hover:bg-slate-800"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Fixtures</h2>
              <span className="text-xl">→</span>
            </div>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Explore the complete schedule, matchups, venues and fixture
              status.
            </p>

            <p className="mt-5 text-sm font-semibold text-white">
              {scheduledMatches.length} upcoming
            </p>
          </Link>

          <Link
            href={`/tournaments/${tournament.id}/standings`}
            className="rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:border-purple-500/30 hover:bg-slate-800"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Standings</h2>
              <span className="text-xl">→</span>
            </div>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Track points, wins, losses and the current tournament table.
            </p>

            <p className="mt-5 text-sm font-semibold text-white">
              View Points Table →
            </p>
          </Link>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-blue-400">
                  Schedule
                </p>

                <h2 className="mt-1 text-xl font-semibold">
                  Upcoming Fixtures
                </h2>
              </div>

              <Link
                href={`/tournaments/${tournament.id}/fixtures`}
                className="text-sm font-semibold text-slate-400 transition hover:text-white"
              >
                View all →
              </Link>
            </div>

            {upcomingPreview.length === 0 ? (
              <div className="mt-6 rounded-xl border border-dashed border-slate-700 p-8 text-center">
                <p className="text-sm text-slate-400">
                  No upcoming fixtures available.
                </p>
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {upcomingPreview.map((match) => {
                  const homeTeam = teamMap.get(match.homeTeamId);
                  const awayTeam = teamMap.get(match.awayTeamId);

                  return (
                    <Link
                      key={match.id}
                      href={`/matches/${match.id}`}
                      className="block rounded-xl border border-slate-800 bg-slate-950 p-4 transition hover:border-slate-700 hover:bg-slate-900"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            {match.matchNumber ? (
                              <span>Match {match.matchNumber}</span>
                            ) : null}

                            {match.round ? (
                              <span>• {match.round}</span>
                            ) : null}
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm font-semibold">
                            <span>{homeTeam?.name ?? "Home Team"}</span>
                            <span className="text-slate-600">vs</span>
                            <span>{awayTeam?.name ?? "Away Team"}</span>
                          </div>

                          <p className="mt-2 text-xs text-slate-500">
                            {match.venue ?? "Venue not set"}
                          </p>
                        </div>

                        <div className="shrink-0 sm:text-right">
                          <p className="text-sm font-semibold text-white">
                            {formatDateTime(match.scheduledAt)}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            View Match →
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-purple-400">
                  Points Table
                </p>

                <h2 className="mt-1 text-xl font-semibold">
                  Current Standings
                </h2>
              </div>

              <Link
                href={`/tournaments/${tournament.id}/standings`}
                className="text-sm font-semibold text-slate-400 transition hover:text-white"
              >
                Full table →
              </Link>
            </div>

            {standingsPreview.length === 0 ? (
              <div className="mt-6 rounded-xl border border-dashed border-slate-700 p-8 text-center">
                <p className="text-sm text-slate-400">
                  Standings will appear once teams are registered.
                </p>
              </div>
            ) : (
              <div className="mt-6 overflow-hidden rounded-xl border border-slate-800">
                <div className="grid grid-cols-[32px_1fr_40px_40px_48px] gap-2 border-b border-slate-800 bg-slate-950 px-3 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <span>#</span>
                  <span>Team</span>
                  <span className="text-center">P</span>
                  <span className="text-center">W</span>
                  <span className="text-center">Pts</span>
                </div>

                {standingsPreview.map((entry, index) => (
                  <div
                    key={entry.team.id}
                    className="grid grid-cols-[32px_1fr_40px_40px_48px] items-center gap-2 border-b border-slate-800 px-3 py-3 last:border-b-0"
                  >
                    <span className="text-sm font-semibold text-slate-500">
                      {index + 1}
                    </span>

                    <span className="truncate text-sm font-medium">
                      {entry.team.name}
                    </span>

                    <span className="text-center text-sm text-slate-400">
                      {entry.played}
                    </span>

                    <span className="text-center text-sm text-slate-400">
                      {entry.wins}
                    </span>

                    <span className="text-center text-sm font-bold text-white">
                      {entry.points}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                Match History
              </p>

              <h2 className="mt-1 text-xl font-semibold">
                Recent Results
              </h2>
            </div>

            <Link
              href={`/tournaments/${tournament.id}/fixtures`}
              className="text-sm font-semibold text-slate-400 transition hover:text-white"
            >
              View fixtures →
            </Link>
          </div>

          {recentResults.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-slate-700 p-8 text-center">
              <p className="text-sm text-slate-400">
                No completed matches yet.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {recentResults.map((match) => {
                const homeTeam = teamMap.get(match.homeTeamId);
                const awayTeam = teamMap.get(match.awayTeamId);

                return (
                  <div
                    key={match.id}
                    className="rounded-xl border border-slate-800 bg-slate-950 p-5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Completed
                      </span>

                      {match.matchNumber ? (
                        <span className="text-xs text-slate-600">
                          Match {match.matchNumber}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-5 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate text-sm font-medium">
                          {homeTeam?.name ?? "Home Team"}
                        </span>

                        {match.winnerTeamId === match.homeTeamId ? (
                          <span className="text-xs font-bold text-emerald-400">
                            WIN
                          </span>
                        ) : null}
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate text-sm font-medium">
                          {awayTeam?.name ?? "Away Team"}
                        </span>

                        {match.winnerTeamId === match.awayTeamId ? (
                          <span className="text-xs font-bold text-emerald-400">
                            WIN
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-4 border-t border-slate-800 pt-4">
                      <p className="text-sm font-semibold text-white">
                        {match.result ?? "Result recorded"}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {formatDate(match.scheduledAt)}
                      </p>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <Link
                        href={`/matches/${match.id}/result`}
                        className="flex-1 rounded-lg border border-slate-700 px-3 py-2 text-center text-xs font-semibold text-slate-300 transition hover:bg-slate-900 hover:text-white"
                      >
                        Result
                      </Link>

                      <Link
                        href={`/matches/${match.id}/scorecard`}
                        className="flex-1 rounded-lg border border-slate-700 px-3 py-2 text-center text-xs font-semibold text-slate-300 transition hover:bg-slate-900 hover:text-white"
                      >
                        Scorecard
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                Tournament Teams
              </p>

              <h2 className="mt-1 text-xl font-semibold">
                Registered Teams
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                {registeredTeams.length} team
                {registeredTeams.length !== 1 ? "s" : ""} registered
              </p>
            </div>

            <Link
              href={`/tournaments/${tournament.id}/standings`}
              className="text-sm font-semibold text-slate-400 transition hover:text-white"
            >
              View table →
            </Link>
          </div>

          {registeredTeams.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-slate-700 p-8 text-center">
              <p className="text-slate-400">No teams registered yet.</p>
            </div>
          ) : (
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {registeredTeams.map((team) => (
                <div
                  key={team.id}
                  className="rounded-xl border border-slate-800 bg-slate-950 p-4 transition hover:border-slate-700"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="truncate font-semibold">{team.name}</h3>

                    <span className="shrink-0 rounded-full bg-slate-800 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Team
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Matches Remaining</p>

            <p className="mt-2 text-2xl font-bold">
              {scheduledMatches.length}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Scheduled and not yet completed
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Completion</p>

            <p className="mt-2 text-2xl font-bold">
              {matches.length > 0
                ? `${Math.round(
                    (completedMatches.length / matches.length) * 100,
                  )}%`
                : "0%"}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Based on completed matches
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Cancelled</p>

            <p className="mt-2 text-2xl font-bold">
              {cancelledMatches.length}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Matches marked as cancelled
            </p>
          </div>
        </section>

        <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-6">
          <p className="text-sm text-slate-400">Tournament ID</p>

          <p className="mt-2 break-all font-mono text-xs text-slate-500">
            {tournament.id}
          </p>
        </div>
      </div>
    </main>
  );
}