"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Sport = {
  id: string;
  name: string;
};

type CreateTournamentFormProps = {
  sports: Sport[];
};

export default function CreateTournamentForm({
  sports,
}: CreateTournamentFormProps) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [sportId, setSportId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/tournaments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          sportId,
          startDate,
          endDate,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to create tournament.");
        return;
      }

      setName("");
      setSportId("");
      setStartDate("");
      setEndDate("");
      setOpen(false);

      router.refresh();
    } catch {
      setError("Failed to create tournament.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-white px-4 py-2 font-medium text-slate-950"
      >
        + Create Tournament
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-96 rounded-xl border border-slate-800 bg-slate-900 p-5"
    >
      <h2 className="text-lg font-semibold">Create Tournament</h2>

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Tournament name"
        className="mt-4 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white outline-none"
      />

      <select
        value={sportId}
        onChange={(e) => setSportId(e.target.value)}
        className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white outline-none"
      >
        <option value="">Select sport</option>

        {sports.map((sport) => (
          <option key={sport.id} value={sport.id}>
            {sport.name}
          </option>
        ))}
      </select>

      <label className="mt-3 block text-sm text-slate-400">
        Start date
      </label>

      <input
        type="date"
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white outline-none"
      />

      <label className="mt-3 block text-sm text-slate-400">
        End date
      </label>

      <input
        type="date"
        value={endDate}
        onChange={(e) => setEndDate(e.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white outline-none"
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
          {loading ? "Creating..." : "Create"}
        </button>

        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-slate-700 px-4 py-2"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}