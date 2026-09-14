"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Member = {
  id: string;
  role: string;
  joinedAt: unknown;
  name: string;
  email: string;
};

type TeamMembersProps = {
  teamId: string;
  members: Member[];
};

export default function TeamMembers({
  teamId,
  members,
}: TeamMembersProps) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("PLAYER");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function addMember(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    if (!name.trim() || !email.trim()) {
      setError("Name and email are required.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/team-members", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          teamId,
          name: name.trim(),
          email: email.trim(),
          role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to add member."
        );
      }

      setName("");
      setEmail("");
      setRole("PLAYER");

      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to add member."
      );
    } finally {
      setLoading(false);
    }
  }

  async function removeMember(memberId: string) {
    const confirmed = window.confirm(
      "Remove this member from the team?"
    );

    if (!confirmed) {
      return;
    }

    setError("");

    try {
      const response = await fetch(
        `/api/team-members?id=${memberId}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to remove member."
        );
      }

      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to remove member."
      );
    }
  }

  return (
    <div className="mt-8">
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">
            Team Members
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            Manage the players and captain of this team.
          </p>

          <div className="mt-6 space-y-3">
            {members.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-800 p-6 text-center text-sm text-slate-500">
                No members added yet.
              </p>
            ) : (
              members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 p-4"
                >
                  <div>
                    <p className="font-medium">
                      {member.name}
                    </p>

                    <p className="text-sm text-slate-500">
                      {member.email}
                    </p>

                    <span className="mt-2 inline-block rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-300">
                      {member.role}
                    </span>
                  </div>

                  <button
                    onClick={() => removeMember(member.id)}
                    className="text-sm text-red-400 hover:text-red-300"
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>

          {error && (
            <p className="mt-4 text-sm text-red-400">
              {error}
            </p>
          )}
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-lg font-semibold">
            Add Member
          </h2>

          <form onSubmit={addMember} className="mt-4">
            <label className="text-sm text-slate-300">
              Name
            </label>

            <input
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              placeholder="Player name"
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
            />

            <label className="mt-4 block text-sm text-slate-300">
              Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="player@nmims.edu"
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
            />

            <label className="mt-4 block text-sm text-slate-300">
              Role
            </label>

            <select
              value={role}
              onChange={(event) =>
                setRole(event.target.value)
              }
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
            >
              <option value="PLAYER">Player</option>
              <option value="CAPTAIN">Captain</option>
            </select>

            <button
              type="submit"
              disabled={loading}
              className="mt-5 w-full rounded-lg bg-white px-4 py-3 font-semibold text-slate-950 hover:bg-slate-200 disabled:opacity-50"
            >
              {loading ? "Adding..." : "Add Member"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}