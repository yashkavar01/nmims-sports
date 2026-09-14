"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Team = {
  id: string;
  name: string;
};

type TeamMember = {
  userId: string;
  teamId: string;
  name: string;
};

type CreatePlayerFormProps = {
  teams: Team[];
  members: TeamMember[];
};

export default function CreatePlayerForm({
  teams,
  members,
}: CreatePlayerFormProps) {
  const router = useRouter();

  const [teamId, setTeamId] = useState(
    teams.length > 0 ? teams[0].id : ""
  );

  const [userId, setUserId] = useState("");
  const [jerseyNo, setJerseyNo] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedTeamMembers = members.filter(
    (member) => member.teamId === teamId
  );

  async function createPlayer(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    if (!teamId || !userId) {
      setError("Please select a team member.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/players", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          teamId,
          userId,
          jerseyNo,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to create player."
        );
      }

      setUserId("");
      setJerseyNo("");

      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to create player."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="text-xl font-semibold">
        Create Player Profile
      </h2>

      <p className="mt-1 text-sm text-slate-400">
        Convert a team member into an official player.
      </p>

      <form onSubmit={createPlayer} className="mt-5">
        <label className="text-sm text-slate-300">
          Team
        </label>

        <select
          value={teamId}
          onChange={(event) => {
            setTeamId(event.target.value);
            setUserId("");
          }}
          className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
        >
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>

        <label className="mt-4 block text-sm text-slate-300">
          Team Member
        </label>

        <select
          value={userId}
          onChange={(event) =>
            setUserId(event.target.value)
          }
          className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
        >
          <option value="">
            Select team member
          </option>

          {selectedTeamMembers.map((member) => (
            <option
              key={member.userId}
              value={member.userId}
            >
              {member.name}
            </option>
          ))}
        </select>

        <label className="mt-4 block text-sm text-slate-300">
          Jersey Number
        </label>

        <input
          type="number"
          min="0"
          value={jerseyNo}
          onChange={(event) =>
            setJerseyNo(event.target.value)
          }
          placeholder="Optional"
          className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
        />

        <button
          type="submit"
          disabled={
            loading ||
            teams.length === 0 ||
            selectedTeamMembers.length === 0
          }
          className="mt-5 w-full rounded-lg bg-white px-4 py-3 font-semibold text-slate-950 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Player"}
        </button>

        {error && (
          <p className="mt-4 text-sm text-red-400">
            {error}
          </p>
        )}
      </form>
    </section>
  );
}