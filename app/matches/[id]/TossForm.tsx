"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Team = {
  id: string;
  name: string;
};

type TossFormProps = {
  matchId: string;
  homeTeam: Team;
  awayTeam: Team;
};

export default function TossForm({
  matchId,
  homeTeam,
  awayTeam,
}: TossFormProps) {
  const router = useRouter();

  const [winner, setWinner] = useState("");
  const [decision, setDecision] = useState<"BAT" | "BOWL" | "">("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function startMatch() {
    setError("");

    if (!winner) {
      setError("Select the toss winner.");
      return;
    }

    if (!decision) {
      setError("Select whether the team chose to bat or bowl.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`/api/matches/${matchId}/toss`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tossWinnerTeamId: winner,
          tossDecision: decision,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Failed to start match.");
        return;
      }

      router.refresh();
    } catch {
      setError("Something went wrong while starting the match.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
          Match Setup
        </p>

        <h2 className="mt-2 text-2xl font-bold text-white">
          Toss & Start Match
        </h2>

        <p className="mt-1 text-sm text-slate-400">
          Record the toss and start the first innings.
        </p>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">
            Toss Winner
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            {[homeTeam, awayTeam].map((team) => {
              const selected = winner === team.id;

              return (
                <button
                  key={team.id}
                  type="button"
                  onClick={() => setWinner(team.id)}
                  className={`rounded-xl border p-4 text-left transition ${
                    selected
                      ? "border-emerald-500 bg-emerald-500/10 text-white"
                      : "border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-500"
                  }`}
                >
                  <div className="text-sm font-semibold">{team.name}</div>

                  <div className="mt-1 text-xs text-slate-500">
                    {selected ? "Toss winner selected" : "Select team"}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">
            Toss Decision
          </label>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setDecision("BAT")}
              className={`rounded-xl border p-5 transition ${
                decision === "BAT"
                  ? "border-emerald-500 bg-emerald-500/10 text-white"
                  : "border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-500"
              }`}
            >
              <div className="text-lg font-bold">BAT</div>
              <div className="mt-1 text-xs text-slate-500">
                Choose to bat first
              </div>
            </button>

            <button
              type="button"
              onClick={() => setDecision("BOWL")}
              className={`rounded-xl border p-5 transition ${
                decision === "BOWL"
                  ? "border-emerald-500 bg-emerald-500/10 text-white"
                  : "border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-500"
              }`}
            >
              <div className="text-lg font-bold">BOWL</div>
              <div className="mt-1 text-xs text-slate-500">
                Choose to bowl first
              </div>
            </button>
          </div>
        </div>
      </div>

      {winner && decision && (
        <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950 p-4">
          <p className="text-xs uppercase tracking-wider text-slate-500">
            Match will begin with
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <span className="font-semibold text-white">
              {winner === homeTeam.id ? homeTeam.name : awayTeam.name}
            </span>

            <span className="text-slate-500">choosing to</span>

            <span className="font-bold text-emerald-400">
              {decision === "BAT" ? "BAT" : "BOWL"}
            </span>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={startMatch}
        disabled={saving || !winner || !decision}
        className="mt-6 w-full rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {saving ? "Starting Match..." : "Start Match"}
      </button>
    </section>
  );
}