import Link from "next/link";

import db from "../../../../lib/db";

type TournamentStandingsPageProps = {
  params: Promise<{ id: string }>;
};

type Standing = {
  teamId: string;
  teamName: string;
  played: number;
  wins: number;
  losses: number;
  ties: number;
  points: number;
};

export default async function TournamentStandingsPage({
  params,
}: TournamentStandingsPageProps) {
  const { id } = await params;

  const tournament =
    await db.orm.public.Tournament.where({
      id,
    }).first();

  if (!tournament) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-2xl font-bold">
            Tournament not found
          </h1>

          <Link
            href="/tournaments"
            className="mt-4 inline-block text-sm text-cyan-400 hover:text-cyan-300"
          >
            ← Back to tournaments
          </Link>
        </div>
      </main>
    );
  }

  const [
    sport,
    registrations,
    matches,
  ] = await Promise.all([
    db.orm.public.Sport.where({
      id: tournament.sportId,
    }).first(),

    db.orm.public.TournamentTeam.where({
      tournamentId: tournament.id,
    }).all(),

    db.orm.public.Match.where({
      tournamentId: tournament.id,
    }).all(),
  ]);

  const teams = await Promise.all(
    registrations.map((registration) =>
      db.orm.public.Team.where({
        id: registration.teamId,
      }).first()
    )
  );

  const teamMap = new Map(
    teams
      .filter(
        (
          team
        ): team is NonNullable<typeof team> =>
          team !== null
      )
      .map((team) => [team.id, team])
  );

  const standings = new Map<string, Standing>();

  for (const registration of registrations) {
    const team = teamMap.get(
      registration.teamId
    );

    if (!team) {
      continue;
    }

    standings.set(team.id, {
      teamId: team.id,
      teamName: team.name,
      played: 0,
      wins: 0,
      losses: 0,
      ties: 0,
      points: 0,
    });
  }

  const completedMatches = matches.filter(
    (match) =>
      match.status === "COMPLETED"
  );

  for (const match of completedMatches) {
    const homeStanding = standings.get(
      match.homeTeamId
    );

    const awayStanding = standings.get(
      match.awayTeamId
    );

    if (!homeStanding || !awayStanding) {
      continue;
    }

    homeStanding.played += 1;
    awayStanding.played += 1;

    if (match.winnerTeamId) {
      if (
        match.winnerTeamId ===
        match.homeTeamId
      ) {
        homeStanding.wins += 1;
        homeStanding.points += 2;
        awayStanding.losses += 1;
      } else if (
        match.winnerTeamId ===
        match.awayTeamId
      ) {
        awayStanding.wins += 1;
        awayStanding.points += 2;
        homeStanding.losses += 1;
      }
    } else if (
      match.result === "Match tied"
    ) {
      homeStanding.ties += 1;
      awayStanding.ties += 1;

      homeStanding.points += 1;
      awayStanding.points += 1;
    }
  }

  const sortedStandings = Array.from(
    standings.values()
  ).sort((a, b) => {
    if (b.points !== a.points) {
      return b.points - a.points;
    }

    if (b.wins !== a.wins) {
      return b.wins - a.wins;
    }

    if (b.played !== a.played) {
      return b.played - a.played;
    }

    return a.teamName.localeCompare(
      b.teamName
    );
  });

  const liveMatches = matches.filter(
    (match) => match.status === "LIVE"
  ).length;

  const upcomingMatches = matches.filter(
    (match) =>
      match.status === "SCHEDULED"
  ).length;

  const formatDate = (
    value: unknown
  ) => {
    if (!value) {
      return "TBD";
    }

    const timestamp =
      value as {
        epochMilliseconds?: number;
      };

    if (
      typeof timestamp.epochMilliseconds ===
      "number"
    ) {
      return new Intl.DateTimeFormat(
        "en-IN",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }
      ).format(
        new Date(
          timestamp.epochMilliseconds
        )
      );
    }

    return "TBD";
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8">
          <Link
            href="/tournaments"
            className="text-sm text-slate-400 transition hover:text-white"
          >
            ← All Tournaments
          </Link>

          <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-cyan-300">
                  {sport?.name ?? "Sport"}
                </span>

                <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-400">
                  Standings
                </span>
              </div>

              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                {tournament.name}
              </h1>

              <p className="mt-2 text-sm text-slate-400">
                Tournament standings and points table
              </p>
            </div>

            <div className="text-sm text-slate-400">
              {formatDate(tournament.startDate)}
              {" — "}
              {formatDate(tournament.endDate)}
            </div>
          </div>
        </div>

        <nav className="mb-8 flex flex-wrap gap-2 border-b border-slate-800 pb-4">
          <Link
            href={`/tournaments/${tournament.id}`}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-400 transition hover:bg-slate-900 hover:text-white"
          >
            Overview
          </Link>

          <Link
            href={`/tournaments/${tournament.id}/live`}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-400 transition hover:bg-slate-900 hover:text-white"
          >
            Live Centre
          </Link>

          <Link
            href={`/tournaments/${tournament.id}/fixtures`}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-400 transition hover:bg-slate-900 hover:text-white"
          >
            Fixtures
          </Link>

          <Link
            href={`/tournaments/${tournament.id}/standings`}
            className="rounded-lg bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-300"
          >
            Standings
          </Link>

          <span className="cursor-not-allowed rounded-lg px-4 py-2 text-sm font-medium text-slate-600">
            Results
          </span>

          <span className="cursor-not-allowed rounded-lg px-4 py-2 text-sm font-medium text-slate-600">
            Teams
          </span>
        </nav>

        <section className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Teams
            </p>
            <p className="mt-2 text-3xl font-bold">
              {sortedStandings.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Live Matches
            </p>
            <p className="mt-2 text-3xl font-bold text-emerald-400">
              {liveMatches}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Upcoming
            </p>
            <p className="mt-2 text-3xl font-bold">
              {upcomingMatches}
            </p>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
          <div className="border-b border-slate-800 px-5 py-5">
            <h2 className="text-xl font-bold">
              Points Table
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              2 points for a win and 1 point for a tie.
            </p>
          </div>

          {sortedStandings.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto max-w-md">
                <h3 className="text-lg font-semibold">
                  No teams registered
                </h3>

                <p className="mt-2 text-sm text-slate-500">
                  Teams will appear here once they
                  are registered for the tournament.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px]">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/50 text-left text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-4 font-semibold">
                      #
                    </th>
                    <th className="px-5 py-4 font-semibold">
                      Team
                    </th>
                    <th className="px-5 py-4 text-center font-semibold">
                      P
                    </th>
                    <th className="px-5 py-4 text-center font-semibold">
                      W
                    </th>
                    <th className="px-5 py-4 text-center font-semibold">
                      L
                    </th>
                    <th className="px-5 py-4 text-center font-semibold">
                      T
                    </th>
                    <th className="px-5 py-4 text-center font-semibold">
                      PTS
                    </th>
                    <th className="px-5 py-4 text-right font-semibold">
                      Form
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {sortedStandings.map(
                    (standing, index) => (
                      <tr
                        key={standing.teamId}
                        className="border-b border-slate-800/70 transition hover:bg-slate-800/30"
                      >
                        <td className="px-5 py-5">
                          <span
                            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                              index === 0
                                ? "bg-cyan-500/15 text-cyan-300"
                                : "bg-slate-800 text-slate-400"
                            }`}
                          >
                            {index + 1}
                          </span>
                        </td>

                        <td className="px-5 py-5">
                          <div className="font-semibold text-white">
                            {standing.teamName}
                          </div>
                        </td>

                        <td className="px-5 py-5 text-center text-slate-300">
                          {standing.played}
                        </td>

                        <td className="px-5 py-5 text-center font-semibold text-emerald-400">
                          {standing.wins}
                        </td>

                        <td className="px-5 py-5 text-center text-red-400">
                          {standing.losses}
                        </td>

                        <td className="px-5 py-5 text-center text-amber-400">
                          {standing.ties}
                        </td>

                        <td className="px-5 py-5 text-center">
                          <span className="text-lg font-bold text-white">
                            {standing.points}
                          </span>
                        </td>

                        <td className="px-5 py-5 text-right text-xs text-slate-500">
                          {standing.played === 0
                            ? "—"
                            : `${standing.wins}W · ${standing.losses}L · ${standing.ties}T`}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={`/tournaments/${tournament.id}/fixtures`}
            className="rounded-xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-600 hover:bg-slate-800"
          >
            View Fixtures
          </Link>

          <Link
            href={`/tournaments/${tournament.id}/live`}
            className="rounded-xl bg-cyan-500 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-400"
          >
            Open Live Centre
          </Link>
        </div>
      </div>
    </main>
  );
}