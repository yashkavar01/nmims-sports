import db from "../../lib/db";
import AddSportForm from "./AddSportForm";
import SportActions from "./SportActions";

export default async function SportsPage() {
  const sports = await db.orm.public.Sport.all();

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white md:p-10">
      <div className="mx-auto max-w-6xl">
        <p className="text-sm text-slate-400">NMIMS Sports Hub</p>

        <div className="mt-2 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Sports</h1>

            <p className="mt-2 text-slate-400">
              Manage all sports available across NMIMS.
            </p>
          </div>

          <AddSportForm />
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {sports.map((sport) => (
            <div
              key={sport.id}
              className="rounded-xl border border-slate-800 bg-slate-900 p-6 transition hover:bg-slate-800"
            >
              <h2 className="text-xl font-semibold">{sport.name}</h2>

              <p className="mt-2 text-sm text-slate-400">
                {sport.description ||
                  "View tournaments, teams, players and statistics."}
              </p>

              <SportActions
                id={sport.id}
                name={sport.name}
                description={sport.description}
              />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}