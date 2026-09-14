import db from "../../../lib/db";

type PlayerPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PlayerPage({
  params,
}: PlayerPageProps) {
  const { id } = await params;

  const player = await db.orm.public.Player
    .where({ id })
    .first();

  if (!player) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-white md:p-10">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-3xl font-bold">
            Player Not Found
          </h1>

          <p className="mt-2 text-slate-400">
            The player you are looking for does not exist.
          </p>
        </div>
      </main>
    );
  }

  const user = await db.orm.public.User
    .where({ id: player.userId })
    .first();

  const team = await db.orm.public.Team
    .where({ id: player.teamId })
    .first();

  const sport = team
    ? await db.orm.public.Sport
        .where({ id: team.sportId })
        .first()
    : null;

  const statisticValues =
    await db.orm.public.StatisticValue
      .where({ playerId: player.id })
      .all();

  const statisticDefinitions =
    await db.orm.public.StatisticDefinition.all();

  const statistics = statisticDefinitions
    .map((definition) => {
      const values = statisticValues.filter(
        (value) =>
          value.statisticId === definition.id
      );

      if (values.length === 0) {
        return null;
      }

      const total = values.reduce(
        (sum, value) => sum + value.value,
        0
      );

      return {
        id: definition.id,
        name: definition.name,
        code: definition.code,
        unit: definition.unit,
        total,
      };
    })
    .filter(
      (
        statistic
      ): statistic is NonNullable<typeof statistic> =>
        statistic !== null
    );

  const events = await db.orm.public.MatchEvent
    .where({ playerId: player.id })
    .all();

  const matches = await Promise.all(
    events.map(async (event) => {
      const match = await db.orm.public.Match
        .where({ id: event.matchId })
        .first();

      return match;
    })
  );

  const uniqueMatches = matches
    .filter(
      (match): match is NonNullable<typeof match> =>
        match !== null
    )
    .filter(
      (match, index, array) =>
        array.findIndex(
          (item) => item.id === match.id
        ) === index
    );

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white md:p-10">
      <div className="mx-auto max-w-6xl">
        <a
          href="/players"
          className="text-sm text-slate-400 hover:text-white"
        >
          ← Back to Players
        </a>

        {/* Player Header */}
        <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-slate-400">
                {sport?.name ?? "Sport"}
              </p>

              <h1 className="mt-2 text-4xl font-bold">
                {user?.name ?? "Unknown Player"}
              </h1>

              <p className="mt-2 text-slate-400">
                {team?.name ?? "Unknown Team"}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                {user?.email ?? "No email available"}
              </p>
            </div>

            <div className="rounded-xl bg-slate-950 px-8 py-5 text-center">
              <p className="text-sm text-slate-500">
                Jersey
              </p>

              <p className="mt-1 text-4xl font-bold">
                {player.jerseyNo ?? "—"}
              </p>
            </div>
          </div>
        </div>

        {/* Overview */}
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">
              Team
            </p>

            <p className="mt-2 text-lg font-semibold">
              {team?.name ?? "Unknown"}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">
              Matches
            </p>

            <p className="mt-2 text-2xl font-bold">
              {uniqueMatches.length}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">
              Recorded Statistics
            </p>

            <p className="mt-2 text-2xl font-bold">
              {statistics.length}
            </p>
          </div>
        </div>

        {/* Statistics */}
        <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">
            Career Statistics
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            Statistics accumulated from recorded matches.
          </p>

          {statistics.length === 0 ? (
            <div className="mt-6 rounded-lg border border-dashed border-slate-800 p-8 text-center">
              <p className="text-slate-400">
                No statistics recorded yet.
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Statistics will appear here once the player
                participates in matches.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {statistics.map((statistic) => (
                <div
                  key={statistic.id}
                  className="rounded-lg border border-slate-800 bg-slate-950 p-5"
                >
                  <p className="text-sm text-slate-400">
                    {statistic.name}
                  </p>

                  <p className="mt-2 text-2xl font-bold">
                    {statistic.total}
                  </p>

                  {statistic.unit && (
                    <p className="mt-1 text-xs text-slate-500">
                      {statistic.unit}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Match History */}
        <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">
            Match History
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            Matches where this player has recorded events.
          </p>

          {uniqueMatches.length === 0 ? (
            <div className="mt-6 rounded-lg border border-dashed border-slate-800 p-8 text-center">
              <p className="text-slate-400">
                No match history yet.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {uniqueMatches.map((match) => (
                <div
                  key={match.id}
                  className="rounded-lg border border-slate-800 bg-slate-950 p-5"
                >
                  <p className="font-semibold">
                    Match
                  </p>

                  <p className="mt-1 text-sm text-slate-500 break-all">
                    {match.id}
                  </p>

                  <p className="mt-2 text-sm text-slate-400">
                    Status: {match.status}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}