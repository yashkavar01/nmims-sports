"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Scorer = {
  id: string;
  name: string;
  email: string;
};

type ScorerAssignmentFormProps = {
  matchId: string;
  scorers: Scorer[];
  assignedById: string | null;
  currentScorer: Scorer | null;
};

export default function ScorerAssignmentForm({
  matchId,
  scorers,
  assignedById,
  currentScorer,
}: ScorerAssignmentFormProps) {
  const router = useRouter();

  const [scorerId, setScorerId] = useState(
    currentScorer?.id ?? ""
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function assignScorer() {
    if (!scorerId) {
      setMessage("Please select a scorer.");
      return;
    }

    if (!assignedById) {
      setMessage(
        "No Sports Admin or Super Admin account is available."
      );
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/matches/${matchId}/scorer`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            scorerId,
            assignedById,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error ?? "Failed to assign scorer.");
        return;
      }

      setMessage("Scorer assigned successfully.");
      router.refresh();
    } catch {
      setMessage("Something went wrong while assigning the scorer.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-400">
          Scorer Assignment
        </p>

        <h2 className="mt-2 text-2xl font-bold">
          Match Scorer
        </h2>

        <p className="mt-2 text-sm text-slate-400">
          Assign the scorer who will operate the live scoring console
          for this match.
        </p>
      </div>

      {currentScorer ? (
        <div className="mb-5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.15em] text-emerald-400">
                Assigned Scorer
              </p>

              <p className="mt-1 text-lg font-semibold">
                {currentScorer.name}
              </p>

              <p className="text-sm text-slate-500">
                {currentScorer.email}
              </p>
            </div>

            <span className="rounded-full border border-emerald-500/30 px-3 py-1 text-xs text-emerald-300">
              ASSIGNED
            </span>
          </div>
        </div>
      ) : null}

      {scorers.length === 0 ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-300">
          No users with the SCORER role are available.
        </div>
      ) : (
        <div className="flex flex-col gap-4 md:flex-row">
          <select
            value={scorerId}
            onChange={(event) => setScorerId(event.target.value)}
            disabled={loading}
            className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-purple-500"
          >
            <option value="">
              Select a scorer
            </option>

            {scorers.map((scorer) => (
              <option key={scorer.id} value={scorer.id}>
                {scorer.name} — {scorer.email}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={assignScorer}
            disabled={loading || !scorerId || !assignedById}
            className="rounded-xl bg-purple-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Assigning..."
              : currentScorer
                ? "Change Scorer"
                : "Assign Scorer"}
          </button>
        </div>
      )}

      {message && (
        <p className="mt-4 text-sm text-slate-300">
          {message}
        </p>
      )}
    </section>
  );
}