import db from "../../lib/db";
import CreateMatchForm from "./CreateMatchForm";

export default async function MatchesPage() {
  const matches = await db.orm.public.Match.all();
  const tournaments = await db.orm.public.Tournament.all();
  const teams = await db.orm.public.Team.all();
  const sports = await db.orm.public.Sport.all();

  const tournamentData = tournaments.map(
    ({ id, name, sportId }) => {
      const sport = sports.find(
        (sport) => sport.id === sportId
      );

      return {
        id,
        name,
        sportId,
        sportName: sport?.name ?? "Unknown Sport",
      };
    }
  );

  const teamData = teams.map(
    ({ id, name, sportId }) => ({
      id,
      name,
      sportId,
    })
  );

  const matchData = await Promise.all(
    matches.map(async (match) => {
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

      const sport = sports.find(
        (sport) => sport.id === match.sportId
      );

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
      };
    })
  );

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white md:p-10">
      <div className="mx-auto max-w-6xl">
        <p className="text-sm text-slate-400">
          NMIMS Sports Hub
        </p>

        <div className="mt-2">
          <h1 className="text-3xl font-bold">
            Matches
          </h1>

          <p className="mt-2 text-slate-400">
            Schedule and manage sports matches.
          </p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_420px]">
          <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <div>
              <h2 className="text-xl font-semibold">
                Match Schedule
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                {matchData.length} match
                {matchData.length !== 1
                  ? "es"
                  : ""}
              </p>
            </div>

            <div className="mt-6 space-y-3">
              {matchData.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-800 p-8 text-center">
                  <p className="text-slate-400">
                    No matches scheduled yet.
                  </p>
                </div>
              ) : (
                matchData.map((match) => (
                  <a
                    key={match.id}
                    href={`/matches/${match.id}`}
                    className="block rounded-lg border border-slate-800 bg-slate-950 p-5 transition hover:bg-slate-900"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-500">
                          {match.sportName}
                        </p>

                        <p className="mt-1 text-sm text-slate-400">
                          {match.tournamentName}
                        </p>
                      </div>

                      <span className="rounded-full border border-slate-700 px-3 py-1 text-xs">
                        {match.status}
                      </span>
                    </div>

                    <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
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

                    <div className="mt-5 flex flex-wrap gap-4 text-xs text-slate-500">
                      {match.round && (
                        <span>
                          Round: {match.round}
                        </span>
                      )}

                      {match.venue && (
                        <span>
                          Venue: {match.venue}
                        </span>
                      )}

                      {match.matchNumber && (
                        <span>
                          Match #{match.matchNumber}
                        </span>
                      )}
                    </div>
                  </a>
                ))
              )}
            </div>
          </section>

          <CreateMatchForm
            tournaments={tournamentData}
            teams={teamData}
          />
        </div>
      </div>
    </main>
  );
}