import db from "../../../../lib/db";
import ScorerConsole from "./ScorerConsole";

type ScorerMatchPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ScorerMatchPage({
  params,
}: ScorerMatchPageProps) {
  const { id } = await params;

  // Temporary development scorer.
  // Authentication will replace this later.
  const scorer = await db.orm.public.User
    .where({ email: "scorer@nmims.local" })
    .first();

  if (!scorer || scorer.role !== "SCORER") {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-white md:p-10">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm text-slate-400">
            NMIMS Sports Hub
          </p>

          <h1 className="mt-3 text-3xl font-bold">
            Scorer Access
          </h1>

          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-slate-400">
              Scorer account not found.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const match = await db.orm.public.Match
    .where({ id })
    .first();

  if (!match) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-white md:p-10">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm text-slate-400">
            NMIMS Sports Hub
          </p>

          <h1 className="mt-3 text-3xl font-bold">
            Match Not Found
          </h1>

          <p className="mt-2 text-slate-400">
            This match does not exist.
          </p>
        </div>
      </main>
    );
  }

  // Verify scorer assignment.
  const assignment =
    await db.orm.public.MatchScorerAssignment
      .where({
        matchId: match.id,
        scorerId: scorer.id,
      })
      .first();

  if (
    !assignment ||
    assignment.status !== "ASSIGNED"
  ) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-white md:p-10">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm text-slate-400">
            NMIMS Sports Hub
          </p>

          <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-8">
            <h1 className="text-2xl font-bold">
              Access Denied
            </h1>

            <p className="mt-2 text-slate-400">
              You are not assigned as the scorer for
              this match.
            </p>

            <a
              href="/scorer"
              className="mt-6 inline-block rounded-lg bg-white px-5 py-3 font-semibold text-slate-950"
            >
              Back to Scorer Dashboard
            </a>
          </div>
        </div>
      </main>
    );
  }

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

  const sport = await db.orm.public.Sport
    .where({ id: match.sportId })
    .first();

  /*
   * Load players registered for this match.
   *
   * MatchPlayer is the authoritative source for a
   * match-specific playing squad.
   */
  const matchPlayers =
    await db.orm.public.MatchPlayer
      .where({ matchId: match.id })
      .all();

  const allPlayers =
    await db.orm.public.Player.all();

  const allUsers =
    await db.orm.public.User.all();

  /*
   * First use MatchPlayer records.
   */
  let homePlayers = matchPlayers
    .filter(
      (matchPlayer) =>
        matchPlayer.teamId === match.homeTeamId
    )
    .map((matchPlayer) => {
      const player = allPlayers.find(
        (item) => item.id === matchPlayer.playerId
      );

      const user = player
        ? allUsers.find(
            (item) => item.id === player.userId
          )
        : null;

      if (!player || !user) {
        return null;
      }

      return {
        id: player.id,
        name: user.name,
        jerseyNo: player.jerseyNo,
      };
    })
    .filter(
      (
        player
      ): player is {
        id: string;
        name: string;
        jerseyNo: number | null;
      } => player !== null
    );

  let awayPlayers = matchPlayers
    .filter(
      (matchPlayer) =>
        matchPlayer.teamId === match.awayTeamId
    )
    .map((matchPlayer) => {
      const player = allPlayers.find(
        (item) => item.id === matchPlayer.playerId
      );

      const user = player
        ? allUsers.find(
            (item) => item.id === player.userId
          )
        : null;

      if (!player || !user) {
        return null;
      }

      return {
        id: player.id,
        name: user.name,
        jerseyNo: player.jerseyNo,
      };
    })
    .filter(
      (
        player
      ): player is {
        id: string;
        name: string;
        jerseyNo: number | null;
      } => player !== null
    );

  /*
   * DEVELOPMENT FALLBACK
   *
   * Until the Playing XI setup screen is built,
   * use the team's existing Player records.
   *
   * Later MatchPlayer will be mandatory.
   */
  if (homePlayers.length === 0) {
    homePlayers = allPlayers
      .filter(
        (player) =>
          player.teamId === match.homeTeamId
      )
      .map((player) => {
        const user = allUsers.find(
          (item) => item.id === player.userId
        );

        return {
          id: player.id,
          name: user?.name ?? "Unknown Player",
          jerseyNo: player.jerseyNo,
        };
      });
  }

  if (awayPlayers.length === 0) {
    awayPlayers = allPlayers
      .filter(
        (player) =>
          player.teamId === match.awayTeamId
      )
      .map((player) => {
        const user = allUsers.find(
          (item) => item.id === player.userId
        );

        return {
          id: player.id,
          name: user?.name ?? "Unknown Player",
          jerseyNo: player.jerseyNo,
        };
      });
  }

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white md:p-10">
      <div className="mx-auto max-w-6xl">

        <p className="text-sm text-slate-400">
          NMIMS Sports Hub
        </p>

        <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-slate-500">
              {sport?.name ?? "Unknown Sport"}
            </p>

            <h1 className="mt-1 text-3xl font-bold">
              Scorer Match Center
            </h1>

            <p className="mt-2 text-slate-400">
              {tournament?.name ?? "Friendly Match"}
            </p>

            {match.round && (
              <p className="mt-1 text-sm text-slate-500">
                {match.round}
                {match.matchNumber
                  ? ` • Match #${match.matchNumber}`
                  : ""}
              </p>
            )}
          </div>

          <span className="w-fit rounded-full border border-slate-700 px-4 py-2 text-sm">
            {match.status}
          </span>
        </div>

        {/* TEAMS */}

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-8">
          <div className="grid items-center gap-8 md:grid-cols-[1fr_auto_1fr]">

            <div className="text-center md:text-right">
              <p className="text-3xl font-bold">
                {homeTeam?.name ?? "Unknown Team"}
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Team A
              </p>
            </div>

            <div className="text-center">
              <p className="text-lg font-bold text-slate-500">
                VS
              </p>
            </div>

            <div className="text-center md:text-left">
              <p className="text-3xl font-bold">
                {awayTeam?.name ?? "Unknown Team"}
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Team B
              </p>
            </div>

          </div>
        </section>

        {/* SCORER AUTHORIZATION */}

        <section className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">

            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Assigned Scorer
              </p>

              <p className="mt-1 text-xl font-semibold">
                {scorer.name}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                {scorer.email}
              </p>
            </div>

            <span className="w-fit rounded-full border border-slate-700 px-4 py-2 text-sm">
              AUTHORIZED
            </span>

          </div>
        </section>

        {/* PLAYER INFORMATION */}

        <section className="mt-6 grid gap-6 md:grid-cols-2">

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">
                  {homeTeam?.name ?? "Team A"} Players
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {homePlayers.length} available
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-2">
              {homePlayers.length === 0 ? (
                <p className="rounded-lg bg-slate-950 p-4 text-sm text-slate-500">
                  No players available.
                </p>
              ) : (
                homePlayers.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between rounded-lg bg-slate-950 p-3"
                  >
                    <span className="font-medium">
                      {player.name}
                    </span>

                    <span className="text-sm text-slate-500">
                      {player.jerseyNo !== null
                        ? `#${player.jerseyNo}`
                        : "—"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">
                  {awayTeam?.name ?? "Team B"} Players
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {awayPlayers.length} available
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-2">
              {awayPlayers.length === 0 ? (
                <p className="rounded-lg bg-slate-950 p-4 text-sm text-slate-500">
                  No players available.
                </p>
              ) : (
                awayPlayers.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between rounded-lg bg-slate-950 p-3"
                  >
                    <span className="font-medium">
                      {player.name}
                    </span>

                    <span className="text-sm text-slate-500">
                      {player.jerseyNo !== null
                        ? `#${player.jerseyNo}`
                        : "—"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

        </section>

        {/* LIVE SCORING */}

        <ScorerConsole
          homeTeamName={
            homeTeam?.name ?? "Unknown Team"
          }
          awayTeamName={
            awayTeam?.name ?? "Unknown Team"
          }
          homePlayers={homePlayers}
          awayPlayers={awayPlayers}
        />

      </div>
    </main>
  );
}