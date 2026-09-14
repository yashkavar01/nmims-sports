"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type RegistrationActionsProps = {
  registrationId: string;
};

export default function RegistrationActions({
  registrationId,
}: RegistrationActionsProps) {
  const router = useRouter();

  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");

  async function review(status: "APPROVED" | "REJECTED") {
    setLoading(status);
    setError("");

    try {
      const response = await fetch(
        "/api/tournament-registrations/review",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            registrationId,
            status,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to review registration."
        );
      }

      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to review registration."
      );
    } finally {
      setLoading("");
    }
  }

  return (
    <div className="flex flex-col items-end gap-3">
      <div className="flex gap-3">
        <button
          onClick={() => review("APPROVED")}
          disabled={loading !== ""}
          className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-slate-200 disabled:opacity-50"
        >
          {loading === "APPROVED"
            ? "Approving..."
            : "Approve"}
        </button>

        <button
          onClick={() => review("REJECTED")}
          disabled={loading !== ""}
          className="rounded-lg border border-red-500/40 px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-500/10 disabled:opacity-50"
        >
          {loading === "REJECTED"
            ? "Rejecting..."
            : "Reject"}
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}