"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Sport = {
  id: string;
  name: string;
};

type CreateTeamFormProps = {
  sports: Sport[];
};

export default function CreateTeamForm({
  sports,
}: CreateTeamFormProps) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [sportId, setSportId] = useState(
    sports.length > 0 ? sports[0].id : ""
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    if (!name.trim() || !sportId) {
      setError("Team name and sport are required.");
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
          name: name.trim(),
          sportId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create team.");
      }

      setName("");
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to create team."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-5"
    >
      <h2 className="text-lg font-semibold">Create Team</h2>

      <p className="mt-1 text-sm text-slate-400">
        Create a team for an NMIMS sport.
      </p>

      <div className="mt-4">
        <label className="text-sm text-slate-300">
          Team Name
        </label>

        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. NMIMS Warriors"
          className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-slate-500"
        />
      </div>

      <div className="mt-4">
        <label className="text-sm text-slate-300">
          Sport
        </label>

        <select
          value={sportId}
          onChange={(event) => setSportId(event.target.value)}
          className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
        >
          {sports.map((sport) => (
            <option key={sport.id} value={sport.id}>
              {sport.name}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="mt-4 text-sm text-red-400">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || sports.length === 0}
        className="mt-5 w-full rounded-lg bg-white px-4 py-3 font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Creating..." : "Create Team"}
      </button>
    </form>
  );
}