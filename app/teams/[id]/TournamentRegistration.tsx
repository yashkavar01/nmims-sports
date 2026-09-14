"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Tournament = {
  id: string;
  name: string;
};

type Registration = {
  tournamentId: string;
  status: string;
};

type TournamentRegistrationProps = {
  teamId: string;
  tournaments: Tournament[];
  registrations: Registration[];
};

export default function TournamentRegistration({
  teamId,
  tournaments,
  registrations,
}: TournamentRegistrationProps) {
  const router = useRouter();

  const [tournamentId, setTournamentId] = useState(
    tournaments.length > 0 ? tournaments[0].id : ""
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function requestRegistration() {
    if (!tournamentId) {
      setError("Please select a tournament.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/tournament-registrations",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            teamId,
            tournamentId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to request registration."
        );
      }

      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to request registration."
      );
    } finally {
      setLoading(false);
    }
  }

  function getRegistrationStatus(tournamentId: string) {
    return registrations.find(
      (registration) =>
        registration.tournamentId === tournamentId
    )?.status;
  }

  return (
    <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="text-xl font-semibold">
        Tournament Registration
      </h2>

      <p className="mt-1 text-sm text-slate-400">
        Request entry into a tournament. A Sports Admin must
        approve the request.
      </p>

      {tournaments.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-slate-800 p-6 text-center text-sm text-slate-500">
          No tournaments are currently available for this sport.
        </p>
      ) : (
        <div className="mt-5 max-w-md">
          <label className="text-sm text-slate-300">
            Select Tournament
          </label>

          <select
            value={tournamentId}
            onChange={(event) =>
              setTournamentId(event.target.value)
            }
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
          >
            {tournaments.map((tournament) => {
              const status = getRegistrationStatus(
                tournament.id
              );

              return (
                <option
                  key={tournament.id}
                  value={tournament.id}
                >
                  {tournament.name}
                  {status ? ` — ${status}` : ""}
                </option>
              );
            })}
          </select>

          {getRegistrationStatus(tournamentId) ? (
            <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950 p-4">
              <p className="text-sm text-slate-400">
                Registration status
              </p>

              <p className="mt-1 font-semibold">
                {getRegistrationStatus(tournamentId)}
              </p>
            </div>
          ) : (
            <button
              onClick={requestRegistration}
              disabled={loading}
              className="mt-4 w-full rounded-lg bg-white px-4 py-3 font-semibold text-slate-950 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Submitting..."
                : "Request Registration"}
            </button>
          )}

          {error && (
            <p className="mt-4 text-sm text-red-400">
              {error}
            </p>
          )}
        </div>
      )}
    </section>
  );
}