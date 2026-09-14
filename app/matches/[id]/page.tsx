import AssignScorerForm from "./AssignScorerForm";
import db from "../../../lib/db";

type MatchPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function MatchPage({
  params,
}: MatchPageProps) {
  const { id } = await params;

  const match = await db.orm.public.Match
    .where({ id })
    .first();

  if (!match) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-white md:p-10">
        <div className="mx-auto max-w-4xl">
          <p className="text-sm text-slate-400">
            NMIMS Sports Hub
          </p>

          <h1 className="mt-3 text-3xl font-bold">
            Match Not Found
          </h1>

          <p className="mt-2 text-slate-400">
            The requested match does not exist.
          </p>
        </div>
      </main>
    );
  }

  const sport = await db.orm.public.Sport
    .where({ id: match.sportId })
    .first();

  const tournament = match.tournamentId
    ? await db.orm.public.Tournament
        .where({ id: match.tournamentId })
        .first()
    : null;

  const homeTeam = await db.orm.public.Team
    .where({ id: match.homeTeamId })
    .first();

  const awayTeam = await db.orm.public.Team
    .where({ id: match.awayTeamId })
    .first();

  const scorerAssignments =
    await db.orm.public.MatchScorerAssignment
      .where({ matchId: match.id })
      .all();

  const users = await db.orm.public.User.all();

  const scorers = users
    .filter((user) => user.role === "SCORER")
    .map(({ id, name, email }) => ({
      id,
      name,
      email,
    }));

  const adminUser =
    users.find(
      (user) =>
        user.role === "SPORTS_ADMIN" ||
        user.role === "SUPER_ADMIN"
    ) ?? null;

  const activeAssignment = scorerAssignments.find(
    (assignment) => assignment.status === "ASSIGNED"
  );

  let scorerName: string | null = null;

  if (activeAssignment) {
    const scorer = await db.orm.public.User
      .where({ id: activeAssignment.scorerId })
      .first();

    scorerName = scorer?.name ?? "Unknown Scorer";
  }

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white md:p-10">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm text-slate-400">
          NMIMS Sports Hub
        </p>

        <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-slate-500">
              {sport?.name ?? "Unknown Sport"}
            </p>

            <h1 className="mt-1 text-3xl font-bold">
              {tournament?.name ?? "Friendly Match"}
            </h1>

            <p className="mt-2 text-slate-400">
              {match.round
                ? `${match.round} • `
                : ""}
              {match.matchNumber
                ? `Match #${match.matchNumber}`
                : "Match"}
            </p>
          </div>

          <span className="w-fit rounded-full border border-slate-700 px-4 py-2 text-sm">
            {match.status}
          </span>
        </div>

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-8">
          <div className="grid items-center gap-8 md:grid-cols-[1fr_auto_1fr]">
            <div className="text-center md:text-right">
              <p className="text-2xl font-bold">
                {homeTeam?.name ?? "Unknown Team"}
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Team A
              </p>
            </div>

            <div className="text-center">
              <p className="text-sm font-semibold text-slate-500">
                VS
              </p>
            </div>

            <div className="text-center md:text-left">
              <p className="text-2xl font-bold">
                {awayTeam?.name ?? "Unknown Team"}
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Team B
              </p>
            </div>
          </div>

          {match.result && (
            <div className="mt-8 rounded-lg border border-slate-800 bg-slate-950 p-4 text-center">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Result
              </p>

              <p className="mt-2 font-semibold">
                {match.result}
              </p>
            </div>
          )}
        </section>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold">
              Match Information
            </h2>

            <div className="mt-5 space-y-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Date & Time
                </p>

                <p className="mt-1 text-slate-200">
                  {match.scheduledAt
                    ? match.scheduledAt.toString()
                    : "Not scheduled"}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Venue
                </p>

                <p className="mt-1 text-slate-200">
                  {match.venue ?? "Not specified"}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Tournament
                </p>

                <p className="mt-1 text-slate-200">
                  {tournament?.name ?? "Friendly Match"}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">
                  Scorer
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  Match-specific scorer assignment
                </p>
              </div>

              <span className="rounded-full border border-slate-700 px-3 py-1 text-xs">
                {scorerName
                  ? "ASSIGNED"
                  : "NOT ASSIGNED"}
              </span>
            </div>

            <div className="mt-6 rounded-lg border border-dashed border-slate-800 bg-slate-950 p-5">
              {scorerName ? (
                <>
                  <p className="text-sm text-slate-500">
                    Assigned Scorer
                  </p>

                  <p className="mt-1 text-xl font-semibold">
                    {scorerName}
                  </p>
                </>
              ) : (
                <>
                  <p className="font-semibold">
                    No scorer assigned
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    A Sports Admin must assign a scorer
                    before the match can be scored.
                  </p>
                </>
              )}
            </div>

            {!scorerName && adminUser && (
              <AssignScorerForm
                matchId={match.id}
                scorers={scorers}
                assignedById={adminUser.id}
              />
            )}
          </section>
        </div>

        <section className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold">
                Live Scoring
              </h2>

              {scorerName ? (
                <>
                  <p className="mt-2 text-sm text-slate-400">
                    This match is ready for live scoring.
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Assigned scorer: {scorerName}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-sm text-slate-400">
                  Live scoring controls will become available
                  after a scorer is assigned.
                </p>
              )}
            </div>

            {scorerName && (
              <a
                href={`/scorer/matches/${match.id}`}
                className="inline-flex w-fit items-center rounded-lg bg-white px-5 py-3 font-semibold text-slate-950 transition hover:bg-slate-200"
              >
                Open Scorer Console →
              </a>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}