export default function SportsPage() {
  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white md:p-10">
      <div className="mx-auto max-w-6xl">
        <p className="text-sm text-slate-400">NMIMS Sports Hub</p>

        <h1 className="mt-2 text-3xl font-bold">Sports</h1>

        <p className="mt-2 text-slate-400">
          Manage all sports available across NMIMS.
        </p>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[
            "Cricket",
            "Football",
            "Basketball",
            "Badminton",
            "Volleyball",
            "Athletics",
          ].map((sport) => (
            <div
              key={sport}
              className="rounded-xl border border-slate-800 bg-slate-900 p-6 transition hover:bg-slate-800"
            >
              <h2 className="text-xl font-semibold">{sport}</h2>

              <p className="mt-2 text-sm text-slate-400">
                View tournaments, teams, players and statistics.
              </p>

              <button className="mt-5 rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-950">
                View Sport
              </button>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}