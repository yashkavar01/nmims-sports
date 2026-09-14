"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type AddTeamFormProps = {
  tournamentId: string;
};

export default function AddTeamForm({
  tournamentId,
}: AddTeamFormProps) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    setError("");

    if (!teamName.trim()) {
      setError("Team name is required.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/teams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tournamentId,
          teamName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to add team.");
        return;
      }

      setTeamName("");
      setOpen(false);

      router.refresh();
    } catch {
      setError("Failed to add team.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-5 rounded-lg bg-white px-4 py-2 font-medium text-slate-950"
      >
        + Add Team
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto mt-5 max-w-md rounded-xl border border-slate-800 bg-slate-900 p-5 text-left"
    >
      <h3 className="text-lg font-semibold">
        Add Team
      </h3>

      <p className="mt-1 text-sm text-slate-400">
        Create a team and register it for this tournament.
      </p>

      <input
        value={teamName}
        onChange={(e) => setTeamName(e.target.value)}
        placeholder="Team name"
        className="mt-4 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white outline-none"
      />

      {error && (
        <p className="mt-3 text-sm text-red-400">
          {error}
        </p>
      )}

      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-white px-4 py-2 font-medium text-slate-950 disabled:opacity-50"
        >
          {loading ? "Adding..." : "Add Team"}
        </button>

        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError("");
          }}
          className="rounded-lg border border-slate-700 px-4 py-2"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}