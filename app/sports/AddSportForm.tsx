"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AddSportForm() {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/sports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          description,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }

      setName("");
      setDescription("");
      setOpen(false);

      router.refresh();
    } catch {
      setError("Failed to create sport.");
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
        + Add Sport
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-80 rounded-xl border border-slate-800 bg-slate-900 p-5"
    >
      <h2 className="text-lg font-semibold">Add Sport</h2>

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Sport name"
        className="mt-4 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white outline-none"
      />

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description"
        rows={3}
        className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white outline-none"
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
          {loading ? "Adding..." : "Add Sport"}
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