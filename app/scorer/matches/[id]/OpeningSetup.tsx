"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Player = {
  id: string;
  name: string;
  jerseyNo: number | null;
};

type OpeningSetupProps = {
  matchId: string;
  battingTeamName: string;
  bowlingTeamName: string;
  battingPlayers: Player[];
  bowlingPlayers: Player[];
};

export default function OpeningSetup({
  matchId,
  battingTeamName,
  bowlingTeamName,
  battingPlayers,
  bowlingPlayers,
}: OpeningSetupProps) {
  const router = useRouter();

  const [strikerId, setStrikerId] = useState("");
  const [nonStrikerId, setNonStrikerId] = useState("");
  const [bowlerId, setBowlerId] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const canStart =
    strikerId &&
    nonStrikerId &&
    bowlerId &&
    strikerId !== nonStrikerId;

  async function startInnings() {
    setError("");

    if (!strikerId || !nonStrikerId || !bowlerId) {
      setError("Select the striker, non-striker and bowler.");
      return;
    }

    if (strikerId === nonStrikerId) {
      setError("Striker and non-striker must be different players.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        `/api/scorer/matches/${matchId}/start`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            strikerId,
            nonStrikerId,
            bowlerId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Failed to start innings.");
        return;
      }

      router.refresh();
    } catch {
      setError("Unable to start innings. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function renderPlayer(player: Player) {
    return (
      <option key={player.id} value={player.id}>
        {player.name}
        {player.jerseyNo !== null
          ? ` (#${player.jerseyNo})`
          : ""}
      </option>
    );
  }

  return (
    <section className="mt-8 rounded-2xl border border-emerald-500/20 bg-slate-900 p-6 md:p-8">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
          Opening Setup
        </p>

        <h2 className="mt-2 text-2xl font-bold">
          Set Up First Ball
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-400">
          Select the two opening batsmen and the bowler who will
          deliver the first ball.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-blue-400">
              Batting
            </p>

            <h3 className="mt-1 text-lg font-semibold">
              {battingTeamName}
            </h3>
          </div>

          <div className="space-y-5">
            <div>
              <label
                htmlFor="striker"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Striker
              </label>

              <select
                id="striker"
                value={strikerId}
                onChange={(event) =>
                  setStrikerId(event.target.value)
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500"
              >
                <option value="">Select striker</option>

                {battingPlayers.map(renderPlayer)}
              </select>
            </div>

            <div>
              <label
                htmlFor="non-striker"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Non-Striker
              </label>

              <select
                id="non-striker"
                value={nonStrikerId}
                onChange={(event) =>
                  setNonStrikerId(event.target.value)
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500"
              >
                <option value="">Select non-striker</option>

                {battingPlayers.map(renderPlayer)}
              </select>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-amber-400">
              Bowling
            </p>

            <h3 className="mt-1 text-lg font-semibold">
              {bowlingTeamName}
            </h3>
          </div>

          <div>
            <label
              htmlFor="bowler"
              className="mb-2 block text-sm font-medium text-slate-300"
            >
              Opening Bowler
            </label>

            <select
              id="bowler"
              value={bowlerId}
              onChange={(event) =>
                setBowlerId(event.target.value)
              }
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-500"
            >
              <option value="">Select bowler</option>

              {bowlingPlayers.map(renderPlayer)}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="mt-8 flex justify-end">
        <button
          type="button"
          onClick={startInnings}
          disabled={!canStart || saving}
          className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Starting Innings..." : "Start Innings"}
        </button>
      </div>
    </section>
  );
}