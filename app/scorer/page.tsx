import db from "../../lib/db";

export default async function ScorerDashboard() {
  const scorer = await db.orm.public.User
    .where({ email: "scorer@nmims.local" })
    .first();

  if (!scorer || scorer.role !== "SCORER") {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-white md:p-10">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm text-slate-400">
            NMIMS Sports Hub
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Scorer Dashboard
          </h1>

          <div className="mt-8 rounded-xl border border-dashed border-slate-800 bg-slate-900 p-8 text-center">
            <p className="text-slate-400">
              Scorer account not found.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const assignments =
    await db.orm.public.MatchScorerAssignment
      .where({ scorerId: scorer.id })
      .all();

  const matchData = await Promise.all(
    assignments.map(async (assignment) => {
      const match = await db.orm.public.Match
        .where({ id: assignment.matchId })
        .first();

      if (!match) {
        return null;
      }

      const homeTeam = await db.orm.public.Team
        .where({ id: match.homeTeamId })
        .first();

      const awayTeam = await db.orm.public.Team
        .where({ id: match.awayTeamId })
        .first();

      const tournament = match.tournamentId
        ? await db.orm.public.Tournament
            .where({ id: match.tournamentId })
            .first()
        : null;

      const sport = await db.orm.public.Sport
        .where({ id: match.sportId })
        .first();

      return {
        id: match.id,
        homeTeamName:
          homeTeam?.name ?? "Unknown Team",
        awayTeamName:
          awayTeam?.name ?? "Unknown Team",
        tournamentName:
          tournament?.name ?? "Friendly Match",
        sportName:
          sport?.name ?? "Unknown Sport",
        scheduledAt: match.scheduledAt,
        venue: match.venue,
        round: match.round,
        matchNumber: match.matchNumber,
        status: match.status,
        result: match.result,
        assignmentStatus: assignment.status,
      };
    })
  );

  const validMatches = matchData.filter(
    (match): match is NonNullable<typeof match> =>
      match !== null
  );

  const upcomingMatches = validMatches.filter(
    (match) =>
      match.status !== "COMPLETED" &&
      match.status !== "CANCELLED"
  );

  const completedMatches = validMatches.filter(
    (match) =>
      match.status === "COMPLETED"
  );

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white md:p-10">
      <div className="mx-auto max-w-6xl">
        <p className="text-sm text-slate-400">
          NMIMS Sports Hub
        </p>

        <div className="mt-2">
          <h1 className="text-3xl font-bold">
            Scorer Dashboard
          </h1>

          <p className="mt-2 text-slate-400">
            Welcome, {scorer.name}.
          </p>
        </div>

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-500">
              Total Matches
            </p>

            <p className="mt-2 text-3xl font-bold">
              {validMatches.length}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-500">
              Upcoming
            </p>

            <p className="mt-2 text-3xl font-bold">
              {upcomingMatches.length}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-500">
              Matches Scored
            </p>

            <p className="mt-2 text-3xl font-bold">
              {completedMatches.length}
            </p>
          </div>
        </section>

        <section className="mt-8">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-xl font-semibold">
                Assigned Matches
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Matches currently assigned to you.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {upcomingMatches.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900 p-8 text-center">
                <p className="text-slate-400">
                  No upcoming matches assigned.
                </p>
              </div>
            ) : (
              upcomingMatches.map((match) => (
                <a
                  key={match.id}
                  href={`/matches/${match.id}`}
                  className="block rounded-xl border border-slate-800 bg-slate-900 p-6 transition hover:border-slate-700 hover:bg-slate-900/80"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        {match.sportName}
                      </p>

                      <h3 className="mt-1 text-xl font-semibold">
                        {match.tournamentName}
                      </h3>

                      <p className="mt-2 text-sm text-slate-400">
                        {match.round
                          ? `${match.round} • `
                          : ""}
                        {match.matchNumber
                          ? `Match #${match.matchNumber}`
                          : "Match"}
                      </p>
                    </div>

                    <span className="w-fit rounded-full border border-slate-700 px-3 py-1 text-xs">
                      {match.status}
                    </span>
                  </div>

                  <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                    <p className="font-semibold">
                      {match.homeTeamName}
                    </p>

                    <span className="text-sm text-slate-500">
                      VS
                    </span>

                    <p className="text-right font-semibold">
                      {match.awayTeamName}
                    </p>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-4 text-sm text-slate-500">
                    {match.scheduledAt && (
                      <span>
                        {match.scheduledAt.toString()}
                      </span>
                    )}

                    {match.venue && (
                      <span>
                        {match.venue}
                      </span>
                    )}
                  </div>

                  <div className="mt-6">
                    <span className="inline-block rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-950">
                      Open Match →
                    </span>
                  </div>
                </a>
              ))
            )}
          </div>
        </section>

        <section className="mt-10">
          <div>
            <h2 className="text-xl font-semibold">
              Scoring History
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Matches you have previously scored.
            </p>
          </div>

          <div className="mt-5 space-y-3">
            {completedMatches.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900 p-8 text-center">
                <p className="text-slate-400">
                  No completed matches in your history.
                </p>
              </div>
            ) : (
              completedMatches.map((match) => (
                <a
                  key={match.id}
                  href={`/matches/${match.id}`}
                  className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900 p-5 transition hover:bg-slate-900/80 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      {match.sportName}
                    </p>

                    <p className="mt-1 font-semibold">
                      {match.homeTeamName}
                      {" vs "}
                      {match.awayTeamName}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {match.tournamentName}
                    </p>
                  </div>

                  <div className="text-left md:text-right">
                    <span className="rounded-full border border-slate-700 px-3 py-1 text-xs">
                      COMPLETED
                    </span>

                    {match.result && (
                      <p className="mt-2 text-sm text-slate-400">
                        {match.result}
                      </p>
                    )}
                  </div>
                </a>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}