import db from "../../lib/db";
import CreateTeamForm from "./CreateTeamForm";

export default async function TeamsPage() {
  const teams = await db.orm.public.Team.all();

  const sports = (await db.orm.public.Sport.all()).map(
    ({ id, name }) => ({
      id,
      name,
    })
  );

  const teamsWithSports = await Promise.all(
    teams.map(async (team) => {
      const sport = await db.orm.public.Sport
        .where({ id: team.sportId })
        .first();

      return {
        ...team,
        sportName: sport?.name ?? "Unknown Sport",
      };
    })
  );

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white md:p-10">
      <div className="mx-auto max-w-6xl">
        <p className="text-sm text-slate-400">
          NMIMS Sports Hub
        </p>

        <div className="mt-2 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Teams</h1>

            <p className="mt-2 text-slate-400">
              Manage teams created by students across NMIMS.
            </p>
          </div>

          <CreateTeamForm sports={sports} />
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {teamsWithSports.length === 0 ? (
            <div className="col-span-full rounded-xl border border-dashed border-slate-800 p-10 text-center">
              <p className="text-slate-400">
                No teams created yet.
              </p>
            </div>
          ) : (
            teamsWithSports.map((team) => (
              <a
  key={team.id}
  href={`/teams/${team.id}`}
  className="block rounded-xl border border-slate-800 bg-slate-900 p-6 transition hover:border-slate-700"
>
                <h2 className="text-xl font-semibold">
                  {team.name}
                </h2>

                <p className="mt-2 text-sm text-slate-400">
                  {team.sportName}
                </p>

                <p className="mt-5 text-sm text-slate-500">
                  Team management coming next.
                </p>
              </a>
            ))
          )}
        </div>
      </div>
    </main>
  );
}