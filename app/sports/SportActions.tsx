"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type SportActionsProps = {
  id: string;
  name: string;
  description: string | null;
};

export default function SportActions({
  id,
  name,
  description,
}: SportActionsProps) {
  const router = useRouter();

  const [editing, setEditing] = useState(false);
  const [sportName, setSportName] = useState(name);
  const [sportDescription, setSportDescription] = useState(
    description || ""
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleUpdate() {
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/sports", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id,
          name: sportName,
          description: sportDescription,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to update sport.");
        return;
      }

      setEditing(false);
      router.refresh();
    } catch {
      setError("Failed to update sport.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${name}?`
    );

    if (!confirmed) return;

    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/sports", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to delete sport.");
        return;
      }

      router.refresh();
    } catch {
      setError("Failed to delete sport.");
    } finally {
      setLoading(false);
    }
  }

  if (editing) {
    return (
      <div className="mt-5 space-y-3">
        <input
          value={sportName}
          onChange={(e) => setSportName(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-white"
        />

        <textarea
          value={sportDescription}
          onChange={(e) => setSportDescription(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-white"
        />

        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleUpdate}
            disabled={loading}
            className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-950"
          >
            {loading ? "Saving..." : "Save"}
          </button>

          <button
            onClick={() => setEditing(false)}
            className="rounded-lg border border-slate-700 px-3 py-2 text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-5">
      <div className="flex gap-2">
        <button
          onClick={() => setEditing(true)}
          className="rounded-lg border border-slate-700 px-3 py-2 text-sm"
        >
          Edit
        </button>

        <button
          onClick={handleDelete}
          disabled={loading}
          className="rounded-lg border border-red-900 px-3 py-2 text-sm text-red-400"
        >
          Delete
        </button>
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-400">{error}</p>
      )}
    </div>
  );
}