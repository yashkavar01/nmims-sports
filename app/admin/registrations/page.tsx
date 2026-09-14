import db from "../../../lib/db";
import RegistrationActions from "./RegistrationActions";

export default async function RegistrationRequestsPage() {
  const registrations =
    await db.orm.public.TournamentRegistrationRequest.all();

  const requests = await Promise.all(
    registrations.map(async (registration) => {
      const team = await db.orm.public.Team
        .where({ id: registration.teamId })
        .first();

      const tournament = await db.orm.public.Tournament
        .where({ id: registration.tournamentId })
        .first();

      let requesterName = "Unknown User";

      if (registration.requestedById) {
        const requester = await db.orm.public.User
          .where({ id: registration.requestedById })
          .first();

        requesterName = requester?.name ?? "Unknown User";
      }

      return {
        id: registration.id,
        status: registration.status,
        teamName: team?.name ?? "Unknown Team",
        tournamentName:
          tournament?.name ?? "Unknown Tournament",
        requesterName,
      };
    })
  );

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white md:p-10">
      <div className="mx-auto max-w-6xl">
        <p className="text-sm text-slate-400">
          NMIMS Sports Hub
        </p>

        <h1 className="mt-2 text-3xl font-bold">
          Registration Requests
        </h1>

        <p className="mt-2 text-slate-400">
          Review team requests for tournament participation.
        </p>

        <div className="mt-8 space-y-4">
          {requests.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 p-10 text-center">
              <p className="text-slate-400">
                No registration requests yet.
              </p>
            </div>
          ) : (
            requests.map((request) => (
              <div
                key={request.id}
                className="rounded-xl border border-slate-800 bg-slate-900 p-6"
              >
                <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">
                      {request.teamName}
                    </h2>

                    <p className="mt-1 text-slate-400">
                      Tournament: {request.tournamentName}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Requested by: {request.requesterName}
                    </p>

                    <span className="mt-3 inline-block rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                      {request.status}
                    </span>
                  </div>

                  {request.status === "PENDING" && (
                    <RegistrationActions
                      registrationId={request.id}
                    />
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}