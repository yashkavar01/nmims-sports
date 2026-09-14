"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Scorer = {
  id: string;
  name: string;
  email: string;
};

type AssignScorerFormProps = {
  matchId: string;
  scorers: Scorer[];
  assignedById: string;
};

export default function AssignScorerForm({
  matchId,
  scorers,
  assignedById,
}: AssignScorerFormProps) {
  const router = useRouter();

  const [scorerId, setScorerId] = useState(
    scorers.length > 0 ? scorers[0].id : ""
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function assignScorer(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    if (!scorerId) {
      setError("Please select a scorer.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "/api/match-scorers",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            matchId,
            scorerId,
            assignedById,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to assign scorer."
        );
      }

      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to assign scorer."
      );
    } finally {
      setLoading(false);
    }
  }

  if (scorers.length === 0) {
    return (
      <div className="mt-5 rounded-lg border border-dashed border-slate-800 bg-slate-950 p-5">
        <p className="font-semibold">
          No scorers available
        </p>

        <p className="mt-1 text-sm text-slate-500">
          Create a user with the SCORER role before
          assigning a scorer to this match.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={assignScorer}
      className="mt-5"
    >
      <label className="text-sm text-slate-300">
        Select Scorer
      </label>

      <select
        value={scorerId}
        onChange={(event) =>
          setScorerId(event.target.value)
        }
        className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
      >
        {scorers.map((scorer) => (
          <option
            key={scorer.id}
            value={scorer.id}
          >
            {scorer.name} — {scorer.email}
          </option>
        ))}
      </select>

      <button
        type="submit"
        disabled={loading}
        className="mt-4 w-full rounded-lg bg-white px-4 py-3 font-semibold text-slate-950 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading
          ? "Assigning..."
          : "Assign Scorer"}
      </button>

      {error && (
        <p className="mt-4 text-sm text-red-400">
          {error}
        </p>
      )}
    </form>
  );
}