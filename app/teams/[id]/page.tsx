import TournamentRegistration from "./TournamentRegistration";
import db from "../../../lib/db";
import TeamMembers from "./TeamMembers";

type TeamPageProps = {
  params: Promise<{ id: string }>;
};

export default async function TeamPage({ params }: TeamPageProps) {
  const { id } = await params;

  const team = await db.orm.public.Team
    .where({ id })
    .first();

  if (!team) {
    return (
      <main className="min-h-screen bg-slate-950 p-10 text-white">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-3xl font-bold">Team Not Found</h1>
          <p className="mt-2 text-slate-400">
            The team you are looking for does not exist.
          </p>
        </div>
      </main>
    );
  }

  const sport = await db.orm.public.Sport
    .where({ id: team.sportId })
    .first();

  const members = await db.orm.public.TeamMember
    .where({ teamId: team.id })
    .all();


  const tournaments = await db.orm.public.Tournament
  .where({ sportId: team.sportId })
  .all();

const registrations =
  await db.orm.public.TournamentRegistrationRequest
    .where({ teamId: team.id })
    .all();

  const membersWithUsers = await Promise.all(
    members.map(async (member) => {
      const user = await db.orm.public.User
        .where({ id: member.userId })
        .first();

      return {
        id: member.id,
        role: member.role,
        joinedAt: member.joinedAt,
        name: user?.name ?? "Unknown User",
        email: user?.email ?? "Unknown Email",
      };
    })
  );

  let creatorName = "Not assigned";

  if (team.createdById) {
    const creator = await db.orm.public.User
      .where({ id: team.createdById })
      .first();

    creatorName = creator?.name ?? "Unknown User";
  }

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white md:p-10">
      <div className="mx-auto max-w-5xl">
        <a
          href="/teams"
          className="text-sm text-slate-400 hover:text-white"
        >
          ← Back to Teams
        </a>

        <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-6">
          <p className="text-sm text-slate-400">Team</p>

          <h1 className="mt-2 text-3xl font-bold">
            {team.name}
          </h1>

          <p className="mt-2 text-slate-400">
            {sport?.name ?? "Unknown Sport"}
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg bg-slate-950 p-4">
              <p className="text-sm text-slate-500">
                Created By
              </p>
              <p className="mt-1 font-medium">
                {creatorName}
              </p>
            </div>

            <div className="rounded-lg bg-slate-950 p-4">
              <p className="text-sm text-slate-500">
                Members
              </p>
              <p className="mt-1 font-medium">
                {membersWithUsers.length}
              </p>
            </div>
          </div>
        </div>

        <TeamMembers
          teamId={team.id}
          members={membersWithUsers}
        />
        <TournamentRegistration
  teamId={team.id}
  tournaments={tournaments.map(({ id, name }) => ({
    id,
    name,
  }))}
  registrations={registrations.map(
    ({ tournamentId, status }) => ({
      tournamentId,
      status,
    })
  )}
/>
      </div>
    </main>
  );
}