import db from "../../../lib/db";
import AddTeamForm from "./AddTeamForm";

type TournamentPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function TournamentPage({
  params,
}: TournamentPageProps) {
  const { id } = await params;

  const tournament = await db.orm.public.Tournament
    .where({ id })
    .first();

  if (!tournament) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-white md:p-10">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-3xl font-bold">
            Tournament not found
          </h1>

          <p className="mt-2 text-slate-400">
            The tournament you are looking for does not exist.
          </p>
        </div>
      </main>
    );
  }

  const registrations = await db.orm.public.TournamentTeam
    .where({ tournamentId: tournament.id })
    .all();

  const teams = await Promise.all(
    registrations.map(async (registration) => {
      return db.orm.public.Team
        .where({ id: registration.teamId })
        .first();
    })
  );

  const registeredTeams = teams.filter(
    (team): team is NonNullable<typeof team> => team !== null
  );

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white md:p-10">
      <div className="mx-auto max-w-6xl">
        <p className="text-sm text-slate-400">
          NMIMS Sports Hub
        </p>

        <h1 className="mt-2 text-3xl font-bold">
          {tournament.name}
        </h1>

        <p className="mt-2 text-slate-400">
          Tournament management
        </p>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">
              Start Date
            </p>

            <p className="mt-2 font-medium">
              {tournament.startDate
                ? tournament.startDate.toString()
                : "Not set"}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">
              End Date
            </p>

            <p className="mt-2 font-medium">
              {tournament.endDate
                ? tournament.endDate.toString()
                : "Not set"}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">
              Tournament ID
            </p>

            <p className="mt-2 break-all text-sm font-medium">
              {tournament.id}
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">
                Teams
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                {registeredTeams.length} team
                {registeredTeams.length !== 1 ? "s" : ""} registered
              </p>
            </div>

            <AddTeamForm tournamentId={tournament.id} />
          </div>

          {registeredTeams.length === 0 ? (
            <div className="mt-6 rounded-lg border border-dashed border-slate-700 p-8 text-center">
              <p className="text-slate-400">
                No teams registered yet.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {registeredTeams.map((team) => (
                <div
                  key={team.id}
                  className="rounded-lg border border-slate-800 bg-slate-950 p-5"
                >
                  <h3 className="text-lg font-semibold">
                    {team.name}
                  </h3>

                  <p className="mt-2 text-sm text-slate-400">
                    Registered team
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}