export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden w-64 border-r border-slate-800 bg-slate-900 p-6 md:block">
          <h1 className="text-2xl font-bold">NMIMS Sports</h1>
          <p className="mt-1 text-sm text-slate-400">Sports Hub</p>

          <nav className="mt-10 space-y-2">
            <div className="rounded-lg bg-slate-800 px-4 py-3">
              Dashboard
            </div>
            <div className="px-4 py-3 text-slate-400">Sports</div>
            <div className="px-4 py-3 text-slate-400">Tournaments</div>
            <div className="px-4 py-3 text-slate-400">Teams</div>
            <div className="px-4 py-3 text-slate-400">Players</div>
            <div className="px-4 py-3 text-slate-400">Matches</div>
          </nav>
        </aside>

        {/* Main content */}
        <section className="flex-1 p-6 md:p-10">
          <header>
            <p className="text-sm text-slate-400">Welcome to</p>
            <h2 className="mt-1 text-3xl font-bold">NMIMS Sports Hub</h2>
            <p className="mt-2 text-slate-400">
              Manage sports, tournaments, teams, players and live matches.
            </p>
          </header>

          {/* Stats */}
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-sm text-slate-400">Sports</p>
              <p className="mt-2 text-3xl font-bold">0</p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-sm text-slate-400">Tournaments</p>
              <p className="mt-2 text-3xl font-bold">0</p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-sm text-slate-400">Teams</p>
              <p className="mt-2 text-3xl font-bold">0</p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-sm text-slate-400">Live Matches</p>
              <p className="mt-2 text-3xl font-bold">0</p>
            </div>
          </div>

          {/* Quick actions */}
          <div className="mt-8">
            <h3 className="text-xl font-semibold">Quick Actions</h3>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <button className="rounded-xl border border-slate-800 bg-slate-900 p-5 text-left transition hover:bg-slate-800">
                <p className="font-semibold">Add Sport</p>
                <p className="mt-1 text-sm text-slate-400">
                  Create a new sport
                </p>
              </button>

              <button className="rounded-xl border border-slate-800 bg-slate-900 p-5 text-left transition hover:bg-slate-800">
                <p className="font-semibold">Create Tournament</p>
                <p className="mt-1 text-sm text-slate-400">
                  Start a new tournament
                </p>
              </button>

              <button className="rounded-xl border border-slate-800 bg-slate-900 p-5 text-left transition hover:bg-slate-800">
                <p className="font-semibold">Create Match</p>
                <p className="mt-1 text-sm text-slate-400">
                  Schedule a match
                </p>
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}