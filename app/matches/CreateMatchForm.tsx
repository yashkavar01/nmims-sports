"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Tournament = {
  id: string;
  name: string;
  sportId: string;
};

type Team = {
  id: string;
  name: string;
  sportId: string;
};

type CreateMatchFormProps = {
  tournaments: Tournament[];
  teams: Team[];
};

export default function CreateMatchForm({
  tournaments,
  teams,
}: CreateMatchFormProps) {
  const router = useRouter();

  const [tournamentId, setTournamentId] = useState(
    tournaments.length > 0 ? tournaments[0].id : ""
  );

  const [homeTeamId, setHomeTeamId] = useState("");
  const [awayTeamId, setAwayTeamId] = useState("");

  const [scheduledAt, setScheduledAt] = useState("");
  const [venue, setVenue] = useState("");
  const [round, setRound] = useState("");
  const [matchNumber, setMatchNumber] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedTournament = tournaments.find(
    (tournament) => tournament.id === tournamentId
  );

  const tournamentTeams = teams.filter(
    (team) =>
      team.sportId === selectedTournament?.sportId
  );

  async function createMatch(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    if (
      !tournamentId ||
      !homeTeamId ||
      !awayTeamId
    ) {
      setError(
        "Please select a tournament and both teams."
      );
      return;
    }

    if (homeTeamId === awayTeamId) {
      setError(
        "A team cannot play against itself."
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/matches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sportId: selectedTournament?.sportId,
          tournamentId,
          homeTeamId,
          awayTeamId,
          scheduledAt: scheduledAt
            ? new Date(scheduledAt).toISOString()
            : null,
          venue,
          round,
          matchNumber,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to create match."
        );
      }

      setHomeTeamId("");
      setAwayTeamId("");
      setScheduledAt("");
      setVenue("");
      setRound("");
      setMatchNumber("");

      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to create match."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="text-xl font-semibold">
        Create Match
      </h2>

      <p className="mt-1 text-sm text-slate-400">
        Schedule a match between officially registered
        tournament teams.
      </p>

      <form
        onSubmit={createMatch}
        className="mt-5 space-y-4"
      >
        <div>
          <label className="text-sm text-slate-300">
            Tournament
          </label>

          <select
            value={tournamentId}
            onChange={(event) => {
              setTournamentId(event.target.value);
              setHomeTeamId("");
              setAwayTeamId("");
            }}
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
          >
            <option value="">
              Select tournament
            </option>

            {tournaments.map((tournament) => (
              <option
                key={tournament.id}
                value={tournament.id}
              >
                {tournament.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm text-slate-300">
            Team A
          </label>

          <select
            value={homeTeamId}
            onChange={(event) =>
              setHomeTeamId(event.target.value)
            }
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
          >
            <option value="">
              Select Team A
            </option>

            {tournamentTeams.map((team) => (
              <option
                key={team.id}
                value={team.id}
                disabled={team.id === awayTeamId}
              >
                {team.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm text-slate-300">
            Team B
          </label>

          <select
            value={awayTeamId}
            onChange={(event) =>
              setAwayTeamId(event.target.value)
            }
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
          >
            <option value="">
              Select Team B
            </option>

            {tournamentTeams.map((team) => (
              <option
                key={team.id}
                value={team.id}
                disabled={team.id === homeTeamId}
              >
                {team.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm text-slate-300">
            Date & Time
          </label>

          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(event) =>
              setScheduledAt(event.target.value)
            }
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
          />
        </div>

        <div>
          <label className="text-sm text-slate-300">
            Venue
          </label>

          <input
            type="text"
            value={venue}
            onChange={(event) =>
              setVenue(event.target.value)
            }
            placeholder="e.g. NMIMS Sports Ground"
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm text-slate-300">
              Round / Stage
            </label>

            <input
              type="text"
              value={round}
              onChange={(event) =>
                setRound(event.target.value)
              }
              placeholder="e.g. Semi Final"
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
            />
          </div>

          <div>
            <label className="text-sm text-slate-300">
              Match Number
            </label>

            <input
              type="number"
              min="1"
              value={matchNumber}
              onChange={(event) =>
                setMatchNumber(event.target.value)
              }
              placeholder="e.g. 12"
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={
            loading ||
            tournaments.length === 0 ||
            tournamentTeams.length < 2
          }
          className="w-full rounded-lg bg-white px-4 py-3 font-semibold text-slate-950 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? "Creating..."
            : "Create Match"}
        </button>

        {error && (
          <p className="text-sm text-red-400">
            {error}
          </p>
        )}
      </form>
    </section>
  );
}