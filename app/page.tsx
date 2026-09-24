import Link from "next/link";

const navigation = [
  { name: "Dashboard", href: "/" },
  { name: "Sports", href: "/sports" },
  { name: "Tournaments", href: "/tournaments" },
  { name: "Teams", href: "/teams" },
  { name: "Players", href: "/players" },
  { name: "Matches", href: "/matches" },
  { name: "Scorer", href: "/scorer" },
];

const quickActions = [
  {
    title: "Add Sport",
    description: "Create a new sport",
    href: "/sports",
  },
  {
    title: "Create Tournament",
    description: "Start a new tournament",
    href: "/tournaments",
  },
  {
    title: "Create Match",
    description: "Schedule a match",
    href: "/matches",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 border-r border-slate-800 bg-slate-900 p-6 md:block">
          <Link href="/" className="block">
            <h1 className="text-2xl font-bold">NMIMS Sports</h1>
            <p className="mt-1 text-sm text-slate-400">Sports Hub</p>
          </Link>

          <nav className="mt-10 space-y-2">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-lg px-4 py-3 transition ${
                  item.href === "/"
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </aside>

        <section className="flex-1 p-6 md:p-10">
          <header>
            <p className="text-sm text-slate-400">Welcome to</p>
            <h2 className="mt-1 text-3xl font-bold">NMIMS Sports Hub</h2>
            <p className="mt-2 text-slate-400">
              Manage sports, tournaments, teams, players and live matches.
            </p>
          </header>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Link
              href="/sports"
              className="rounded-xl border border-slate-800 bg-slate-900 p-5 transition hover:bg-slate-800"
            >
              <p className="text-sm text-slate-400">Sports</p>
              <p className="mt-2 text-3xl font-bold">?</p>
            </Link>

            <Link
              href="/tournaments"
              className="rounded-xl border border-slate-800 bg-slate-900 p-5 transition hover:bg-slate-800"
            >
              <p className="text-sm text-slate-400">Tournaments</p>
              <p className="mt-2 text-3xl font-bold">?</p>
            </Link>

            <Link
              href="/teams"
              className="rounded-xl border border-slate-800 bg-slate-900 p-5 transition hover:bg-slate-800"
            >
              <p className="text-sm text-slate-400">Teams</p>
              <p className="mt-2 text-3xl font-bold">?</p>
            </Link>

            <Link
              href="/matches"
              className="rounded-xl border border-slate-800 bg-slate-900 p-5 transition hover:bg-slate-800"
            >
              <p className="text-sm text-slate-400">Live Matches</p>
              <p className="mt-2 text-3xl font-bold">?</p>
            </Link>
          </div>

          <div className="mt-8">
            <h3 className="text-xl font-semibold">Quick Actions</h3>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {quickActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="rounded-xl border border-slate-800 bg-slate-900 p-5 text-left transition hover:bg-slate-800"
                >
                  <p className="font-semibold">{action.title}</p>
                  <p className="mt-1 text-sm text-slate-400">
                    {action.description}
                  </p>
                </Link>
              ))}
            </div>
          </div>

          <div className="mt-8">
            <h3 className="text-xl font-semibold">Platform Modules</h3>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Link
                href="/players"
                className="rounded-xl border border-slate-800 bg-slate-900 p-5 transition hover:bg-slate-800"
              >
                <p className="font-semibold">Players</p>
                <p className="mt-1 text-sm text-slate-400">
                  Manage player profiles and team members.
                </p>
              </Link>

              <Link
                href="/scorer"
                className="rounded-xl border border-slate-800 bg-slate-900 p-5 transition hover:bg-slate-800"
              >
                <p className="font-semibold">Scorer Console</p>
                <p className="mt-1 text-sm text-slate-400">
                  Access assigned matches and live scoring.
                </p>
              </Link>

              <Link
                href="/admin/registrations"
                className="rounded-xl border border-slate-800 bg-slate-900 p-5 transition hover:bg-slate-800"
              >
                <p className="font-semibold">Registrations</p>
                <p className="mt-1 text-sm text-slate-400">
                  Review tournament registration requests.
                </p>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
