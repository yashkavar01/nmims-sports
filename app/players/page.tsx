import db from "../../lib/db";
import CreatePlayerForm from "./CreatePlayerForm";

export default async function PlayersPage() {
  const teams = await db.orm.public.Team.all();
  const members = await db.orm.public.TeamMember.all();
  const players = await db.orm.public.Player.all();
  const users = await db.orm.public.User.all();

  const memberData = members
    .map((member) => {
      const user = users.find(
        (user) => user.id === member.userId
      );

      return {
        userId: member.userId,
        teamId: member.teamId,
        name: user?.name ?? "Unknown User",
      };
    })
    .filter((member) => member.name !== "Unknown User");

  const playerData = players.map((player) => {
    const user = users.find(
      (user) => user.id === player.userId
    );

    const team = teams.find(
      (team) => team.id === player.teamId
    );

    return {
      id: player.id,
      name: user?.name ?? "Unknown User",
      teamName: team?.name ?? "Unknown Team",
      jerseyNo: player.jerseyNo,
    };
  });

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white md:p-10">
      <div className="mx-auto max-w-6xl">
        <p className="text-sm text-slate-400">
          NMIMS Sports Hub
        </p>

        <div className="mt-2">
          <h1 className="text-3xl font-bold">
            Players
          </h1>

          <p className="mt-2 text-slate-400">
            Manage official players across NMIMS teams.
          </p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px]">
          <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">
                  Player Directory
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  {playerData.length} player
                  {playerData.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {playerData.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-800 p-8 text-center">
                  <p className="text-slate-400">
                    No players created yet.
                  </p>
                </div>
              ) : (
                playerData.map((player) => (
                  <a
                    key={player.id}
                    href={`/players/${player.id}`}
                    className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 p-4 transition hover:bg-slate-900"
                  >
                    <div>
                      <p className="font-semibold">
                        {player.name}
                      </p>

                      <p className="mt-1 text-sm text-slate-400">
                        {player.teamName}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-slate-500">
                        Jersey
                      </p>

                      <p className="text-lg font-semibold">
                        {player.jerseyNo ?? "—"}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        View Profile →
                      </p>
                    </div>
                  </a>
                ))
              )}
            </div>
          </section>

          <CreatePlayerForm
            teams={teams.map(({ id, name }) => ({
              id,
              name,
            }))}
            members={memberData}
          />
        </div>
      </div>
    </main>
  );
}