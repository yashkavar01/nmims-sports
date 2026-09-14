import db from "../../lib/db";
import CreateTournamentForm from "./CreateTournamentForm";

export default async function TournamentsPage() {
  const tournaments = await db.orm.public.Tournament.all();
  const sports = await db.orm.public.Sport.all();

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white md:p-10">
      <div className="mx-auto max-w-6xl">
        <p className="text-sm text-slate-400">NMIMS Sports Hub</p>

        <div className="mt-2 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Tournaments</h1>

            <p className="mt-2 text-slate-400">
              Manage tournaments across all sports.
            </p>
          </div>

          <CreateTournamentForm sports={sports} />
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {tournaments.length === 0 ? (
            <div className="col-span-full rounded-xl border border-dashed border-slate-800 p-10 text-center">
              <p className="text-slate-400">
                No tournaments created yet.
              </p>
            </div>
          ) : (
            tournaments.map((tournament) => (
              <a
                key={tournament.id}
                href={`/tournaments/${tournament.id}`}
                className="block rounded-xl border border-slate-800 bg-slate-900 p-6 transition hover:bg-slate-800"
              >
                <h2 className="text-xl font-semibold">
                  {tournament.name}
                </h2>

                <p className="mt-2 text-sm text-slate-400">
                  Tournament
                </p>

                <div className="mt-5 text-sm text-slate-400">
                  <p>
                    Start:{" "}
                    {tournament.startDate
                      ? tournament.startDate.toString()
                      : "Not set"}
                  </p>

                  <p className="mt-1">
                    End:{" "}
                    {tournament.endDate
                      ? tournament.endDate.toString()
                      : "Not set"}
                  </p>
                </div>

                <p className="mt-5 text-sm font-medium text-white">
                  Open Tournament →
                </p>
              </a>
            ))
          )}
        </div>
      </div>
    </main>
  );
}