"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type SquadPlayer = {
  id: string;
  name: string;
  jerseyNo: number | null;
};

type Team = {
  id: string;
  name: string;
  players: SquadPlayer[];
};

type ExistingMatchPlayer = {
  id: string;
  playerId: string;
  teamId: string;
  role: string;
  position: number | null;
};

type SelectedPlayer = {
  playerId: string;
  teamId: string;
  role: "PLAYING" | "SUBSTITUTE";
  position: number | null;
};

type MatchSquadFormProps = {
  matchId: string;
  homeTeam: Team;
  awayTeam: Team;
  playersPerTeam: number;
  substitutesPerTeam: number;
  existingPlayers: ExistingMatchPlayer[];
};

export default function MatchSquadForm({
  matchId,
  homeTeam,
  awayTeam,
  playersPerTeam,
  substitutesPerTeam,
  existingPlayers,
}: MatchSquadFormProps) {
  const router = useRouter();

  const initialSelection = useMemo(() => {
    const selection = new Map<string, SelectedPlayer>();

    for (const player of existingPlayers) {
      selection.set(player.playerId, {
        playerId: player.playerId,
        teamId: player.teamId,
        role:
          player.role === "SUBSTITUTE"
            ? "SUBSTITUTE"
            : "PLAYING",
        position:
          player.role === "SUBSTITUTE"
            ? null
            : player.position,
      });
    }

    return selection;
  }, [existingPlayers]);

  const [selectedPlayers, setSelectedPlayers] =
    useState<Map<string, SelectedPlayer>>(initialSelection);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function togglePlayer(player: SquadPlayer, teamId: string) {
    setSelectedPlayers((current) => {
      const next = new Map(current);

      if (next.has(player.id)) {
        next.delete(player.id);
        return next;
      }

      const teamPlayingCount = Array.from(next.values()).filter(
        (item) =>
          item.teamId === teamId &&
          item.role === "PLAYING"
      ).length;

      next.set(player.id, {
        playerId: player.id,
        teamId,
        role:
          teamPlayingCount < playersPerTeam
            ? "PLAYING"
            : "SUBSTITUTE",
        position:
          teamPlayingCount < playersPerTeam
            ? teamPlayingCount + 1
            : null,
      });

      return next;
    });
  }

  function updateRole(
    playerId: string,
    teamId: string,
    role: "PLAYING" | "SUBSTITUTE"
  ) {
    setSelectedPlayers((current) => {
      const next = new Map(current);
      const existing = next.get(playerId);

      if (!existing) {
        return next;
      }

      if (role === "PLAYING") {
        const playingCount = Array.from(next.values()).filter(
          (item) =>
            item.teamId === teamId &&
            item.role === "PLAYING" &&
            item.playerId !== playerId
        ).length;

        if (playingCount >= playersPerTeam) {
          return next;
        }

        next.set(playerId, {
          ...existing,
          role: "PLAYING",
          position: playingCount + 1,
        });
      } else {
        next.set(playerId, {
          ...existing,
          role: "SUBSTITUTE",
          position: null,
        });
      }

      return next;
    });
  }

  function updatePosition(
    playerId: string,
    value: string
  ) {
    setSelectedPlayers((current) => {
      const next = new Map(current);
      const existing = next.get(playerId);

      if (!existing) {
        return next;
      }

      const position =
        value === "" ? null : Number(value);

      next.set(playerId, {
        ...existing,
        position,
      });

      return next;
    });
  }

  function getTeamSelection(teamId: string) {
    return Array.from(selectedPlayers.values()).filter(
      (player) => player.teamId === teamId
    );
  }

  function getPlayingPlayers(teamId: string) {
    return getTeamSelection(teamId).filter(
      (player) => player.role === "PLAYING"
    );
  }

  function getSubstitutes(teamId: string) {
    return getTeamSelection(teamId).filter(
      (player) => player.role === "SUBSTITUTE"
    );
  }

  function validateTeam(
    team: Team
  ): string | null {
    const selected = getTeamSelection(team.id);
    const playing = getPlayingPlayers(team.id);
    const substitutes = getSubstitutes(team.id);

    if (playing.length !== playersPerTeam) {
      return `${team.name}: select exactly ${playersPerTeam} playing players.`;
    }

    if (substitutes.length > substitutesPerTeam) {
      return `${team.name}: maximum ${substitutesPerTeam} substitutes are allowed.`;
    }

    const positions = playing
      .map((player) => player.position)
      .sort((a, b) => (a ?? 0) - (b ?? 0));

    for (let index = 0; index < positions.length; index++) {
      if (positions[index] !== index + 1) {
        return `${team.name}: playing positions must be continuous from 1 to ${playersPerTeam}.`;
      }
    }

    if (selected.length === 0) {
      return `${team.name}: select players.`;
    }

    return null;
  }

  async function saveSquad() {
    setError("");
    setMessage("");

    const homeError = validateTeam(homeTeam);

    if (homeError) {
      setError(homeError);
      return;
    }

    const awayError = validateTeam(awayTeam);

    if (awayError) {
      setError(awayError);
      return;
    }

    setSaving(true);

    try {
      const players = Array.from(selectedPlayers.values());

      const response = await fetch("/api/match-players", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          matchId,
          players,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ?? "Failed to save match squad."
        );
      }

      setMessage("Playing XI and substitutes saved successfully.");

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save match squad."
      );
    } finally {
      setSaving(false);
    }
  }

  function renderTeam(team: Team) {
    const selected = getTeamSelection(team.id);
    const playing = getPlayingPlayers(team.id);
    const substitutes = getSubstitutes(team.id);

    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-white">
              {team.name}
            </h3>

            <p className="mt-1 text-sm text-slate-400">
              {playing.length}/{playersPerTeam} Playing XI
              {" • "}
              {substitutes.length}/{substitutesPerTeam} Substitutes
            </p>
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-300">
            {selected.length} selected
          </div>
        </div>

        <div className="space-y-3">
          {team.players.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-700 p-5 text-center text-sm text-slate-500">
              No players registered for this team.
            </div>
          ) : (
            team.players.map((player) => {
              const selection = selectedPlayers.get(player.id);
              const isSelected = Boolean(selection);

              return (
                <div
                  key={player.id}
                  className={`rounded-xl border p-4 transition ${
                    isSelected
                      ? "border-blue-500/50 bg-blue-500/10"
                      : "border-slate-800 bg-slate-900"
                  }`}
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <label className="flex cursor-pointer items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() =>
                          togglePlayer(
                            player,
                            team.id
                          )
                        }
                        className="h-4 w-4"
                      />

                      <div>
                        <p className="font-medium text-white">
                          {player.name}
                        </p>

                        <p className="text-xs text-slate-500">
                          {player.jerseyNo !== null
                            ? `Jersey #${player.jerseyNo}`
                            : "No jersey number"}
                        </p>
                      </div>
                    </label>

                    {selection && (
                      <div className="flex flex-wrap items-center gap-3">
                        <select
                          value={selection.role}
                          onChange={(event) =>
                            updateRole(
                              player.id,
                              team.id,
                              event.target
                                .value as
                                | "PLAYING"
                                | "SUBSTITUTE"
                            )
                          }
                          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none"
                        >
                          <option value="PLAYING">
                            Playing XI
                          </option>
                          <option value="SUBSTITUTE">
                            Substitute
                          </option>
                        </select>

                        {selection.role === "PLAYING" && (
                          <input
                            type="number"
                            min={1}
                            max={playersPerTeam}
                            value={
                              selection.position ?? ""
                            }
                            onChange={(event) =>
                              updatePosition(
                                player.id,
                                event.target.value
                              )
                            }
                            className="w-24 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none"
                            placeholder="Position"
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  return (
    <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">
          Match Setup
        </p>

        <h2 className="mt-2 text-2xl font-bold text-white">
          Playing XI & Substitutes
        </h2>

        <p className="mt-2 text-sm text-slate-400">
          Select the players who will be available for this
          match and define the Playing XI.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {renderTeam(homeTeam)}
        {renderTeam(awayTeam)}
      </div>

      {(error || message) && (
        <div className="mt-6">
          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {message && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
              {message}
            </div>
          )}
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={saveSquad}
          disabled={saving}
          className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving Squad..." : "Save Match Squad"}
        </button>
      </div>
    </section>
  );
}