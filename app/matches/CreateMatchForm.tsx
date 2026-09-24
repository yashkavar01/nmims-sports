"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Tournament = {
  id: string;
  name: string;
  sportId: string;
  sportName: string;
};

type Team = {
  id: string;
  name: string;
  sportId: string;
};

type CreateMatchFormProps = {
  tournaments: Tournament[];
  teams: Team[];
};

export default function CreateMatchForm({
  tournaments,
  teams,
}: CreateMatchFormProps) {
  const router = useRouter();

  const [tournamentId, setTournamentId] = useState(
    tournaments.length > 0 ? tournaments[0].id : ""
  );

  const [homeTeamId, setHomeTeamId] = useState("");
  const [awayTeamId, setAwayTeamId] = useState("");

  const [scheduledAt, setScheduledAt] = useState("");
  const [venue, setVenue] = useState("");
  const [round, setRound] = useState("");
  const [matchNumber, setMatchNumber] = useState("");

  const [format, setFormat] = useState("T20");
  const [overs, setOvers] = useState("20");
  const [playersPerTeam, setPlayersPerTeam] = useState("11");
  const [substitutesPerTeam, setSubstitutesPerTeam] =
    useState("5");
  const [inningsPerTeam, setInningsPerTeam] = useState("1");

  const [wideEnabled, setWideEnabled] = useState(true);
  const [noBallEnabled, setNoBallEnabled] = useState(true);
  const [byeEnabled, setByeEnabled] = useState(true);
  const [legByeEnabled, setLegByeEnabled] = useState(true);
  const [penaltyRunsEnabled, setPenaltyRunsEnabled] =
    useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedTournament = tournaments.find(
    (tournament) => tournament.id === tournamentId
  );

  const isCricket =
    selectedTournament?.sportName.toLowerCase() ===
    "cricket";

  const tournamentTeams = teams.filter(
    (team) =>
      team.sportId === selectedTournament?.sportId
  );

  function resetCricketConfig() {
    setFormat("T20");
    setOvers("20");
    setPlayersPerTeam("11");
    setSubstitutesPerTeam("5");
    setInningsPerTeam("1");
    setWideEnabled(true);
    setNoBallEnabled(true);
    setByeEnabled(true);
    setLegByeEnabled(true);
    setPenaltyRunsEnabled(false);
  }

  async function createMatch(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    if (
      !tournamentId ||
      !homeTeamId ||
      !awayTeamId
    ) {
      setError(
        "Please select a tournament and both teams."
      );
      return;
    }

    if (homeTeamId === awayTeamId) {
      setError(
        "A team cannot play against itself."
      );
      return;
    }

    if (isCricket) {
      const oversValue = Number(overs);
      const playersValue = Number(playersPerTeam);
      const substitutesValue = Number(
        substitutesPerTeam
      );
      const inningsValue = Number(inningsPerTeam);

      if (
        !Number.isInteger(oversValue) ||
        oversValue <= 0
      ) {
        setError("Overs must be a positive whole number.");
        return;
      }

      if (
        !Number.isInteger(playersValue) ||
        playersValue <= 0
      ) {
        setError(
          "Players per team must be a positive whole number."
        );
        return;
      }

      if (
        !Number.isInteger(substitutesValue) ||
        substitutesValue < 0
      ) {
        setError(
          "Substitutes per team cannot be negative."
        );
        return;
      }

      if (
        !Number.isInteger(inningsValue) ||
        inningsValue <= 0
      ) {
        setError(
          "Innings per team must be a positive whole number."
        );
        return;
      }
    }

    setLoading(true);

    try {
      const response = await fetch("/api/matches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sportId: selectedTournament?.sportId,
          tournamentId,
          homeTeamId,
          awayTeamId,
          scheduledAt: scheduledAt
            ? new Date(
                scheduledAt
              ).toISOString()
            : null,
          venue,
          round,
          matchNumber,

          cricketConfig: isCricket
            ? {
                format,
                overs: Number(overs),
                playersPerTeam: Number(
                  playersPerTeam
                ),
                substitutesPerTeam: Number(
                  substitutesPerTeam
                ),
                inningsPerTeam: Number(
                  inningsPerTeam
                ),
                wideEnabled,
                noBallEnabled,
                byeEnabled,
                legByeEnabled,
                penaltyRunsEnabled,
              }
            : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to create match."
        );
      }

      setHomeTeamId("");
      setAwayTeamId("");
      setScheduledAt("");
      setVenue("");
      setRound("");
      setMatchNumber("");
      resetCricketConfig();

      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to create match."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="text-xl font-semibold">
        Create Match
      </h2>

      <p className="mt-1 text-sm text-slate-400">
        Schedule a match between officially registered
        tournament teams.
      </p>

      <form
        onSubmit={createMatch}
        className="mt-5 space-y-5"
      >
        <div>
          <label className="text-sm text-slate-300">
            Tournament
          </label>

          <select
            value={tournamentId}
            onChange={(event) => {
              setTournamentId(event.target.value);
              setHomeTeamId("");
              setAwayTeamId("");
            }}
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
          >
            <option value="">
              Select tournament
            </option>

            {tournaments.map((tournament) => (
              <option
                key={tournament.id}
                value={tournament.id}
              >
                {tournament.name} —{" "}
                {tournament.sportName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm text-slate-300">
            Team A
          </label>

          <select
            value={homeTeamId}
            onChange={(event) =>
              setHomeTeamId(event.target.value)
            }
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
          >
            <option value="">
              Select Team A
            </option>

            {tournamentTeams.map((team) => (
              <option
                key={team.id}
                value={team.id}
                disabled={team.id === awayTeamId}
              >
                {team.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm text-slate-300">
            Team B
          </label>

          <select
            value={awayTeamId}
            onChange={(event) =>
              setAwayTeamId(event.target.value)
            }
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
          >
            <option value="">
              Select Team B
            </option>

            {tournamentTeams.map((team) => (
              <option
                key={team.id}
                value={team.id}
                disabled={team.id === homeTeamId}
              >
                {team.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm text-slate-300">
            Date & Time
          </label>

          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(event) =>
              setScheduledAt(event.target.value)
            }
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
          />
        </div>

        <div>
          <label className="text-sm text-slate-300">
            Venue
          </label>

          <input
            type="text"
            value={venue}
            onChange={(event) =>
              setVenue(event.target.value)
            }
            placeholder="e.g. NMIMS Sports Ground"
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm text-slate-300">
              Round / Stage
            </label>

            <input
              type="text"
              value={round}
              onChange={(event) =>
                setRound(event.target.value)
              }
              placeholder="e.g. Semi Final"
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
            />
          </div>

          <div>
            <label className="text-sm text-slate-300">
              Match Number
            </label>

            <input
              type="number"
              min="1"
              value={matchNumber}
              onChange={(event) =>
                setMatchNumber(event.target.value)
              }
              placeholder="e.g. 12"
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
            />
          </div>
        </div>

        {isCricket && (
          <div className="rounded-xl border border-emerald-900/60 bg-slate-950 p-5">
            <div>
              <h3 className="text-lg font-semibold text-white">
                Cricket Match Configuration
              </h3>

              <p className="mt-1 text-sm text-slate-400">
                Configure the rules and playing structure
                for this cricket match.
              </p>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm text-slate-300">
                  Match Format
                </label>

                <select
                  value={format}
                  onChange={(event) =>
                    setFormat(event.target.value)
                  }
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none"
                >
                  <option value="T10">T10</option>
                  <option value="T20">T20</option>
                  <option value="T50">T50</option>
                  <option value="CUSTOM">
                    Custom
                  </option>
                </select>
              </div>

              <div>
                <label className="text-sm text-slate-300">
                  Total Overs
                </label>

                <input
                  type="number"
                  min="1"
                  step="1"
                  value={overs}
                  onChange={(event) =>
                    setOvers(event.target.value)
                  }
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none"
                />
              </div>

              <div>
                <label className="text-sm text-slate-300">
                  Players Per Team
                </label>

                <input
                  type="number"
                  min="1"
                  step="1"
                  value={playersPerTeam}
                  onChange={(event) =>
                    setPlayersPerTeam(
                      event.target.value
                    )
                  }
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none"
                />
              </div>

              <div>
                <label className="text-sm text-slate-300">
                  Substitutes Per Team
                </label>

                <input
                  type="number"
                  min="0"
                  step="1"
                  value={substitutesPerTeam}
                  onChange={(event) =>
                    setSubstitutesPerTeam(
                      event.target.value
                    )
                  }
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-sm text-slate-300">
                  Innings Per Team
                </label>

                <input
                  type="number"
                  min="1"
                  step="1"
                  value={inningsPerTeam}
                  onChange={(event) =>
                    setInningsPerTeam(
                      event.target.value
                    )
                  }
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none"
                />
              </div>
            </div>

            <div className="mt-6">
              <p className="text-sm font-medium text-slate-300">
                Extra Rules
              </p>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-800 bg-slate-900 px-4 py-3">
                  <span className="text-sm text-slate-300">
                    Wide Balls
                  </span>

                  <input
                    type="checkbox"
                    checked={wideEnabled}
                    onChange={(event) =>
                      setWideEnabled(
                        event.target.checked
                      )
                    }
                    className="h-4 w-4"
                  />
                </label>

                <label className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-800 bg-slate-900 px-4 py-3">
                  <span className="text-sm text-slate-300">
                    No Balls
                  </span>

                  <input
                    type="checkbox"
                    checked={noBallEnabled}
                    onChange={(event) =>
                      setNoBallEnabled(
                        event.target.checked
                      )
                    }
                    className="h-4 w-4"
                  />
                </label>

                <label className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-800 bg-slate-900 px-4 py-3">
                  <span className="text-sm text-slate-300">
                    Byes
                  </span>

                  <input
                    type="checkbox"
                    checked={byeEnabled}
                    onChange={(event) =>
                      setByeEnabled(
                        event.target.checked
                      )
                    }
                    className="h-4 w-4"
                  />
                </label>

                <label className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-800 bg-slate-900 px-4 py-3">
                  <span className="text-sm text-slate-300">
                    Leg Byes
                  </span>

                  <input
                    type="checkbox"
                    checked={legByeEnabled}
                    onChange={(event) =>
                      setLegByeEnabled(
                        event.target.checked
                      )
                    }
                    className="h-4 w-4"
                  />
                </label>

                <label className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 sm:col-span-2">
                  <span className="text-sm text-slate-300">
                    Penalty Runs
                  </span>

                  <input
                    type="checkbox"
                    checked={penaltyRunsEnabled}
                    onChange={(event) =>
                      setPenaltyRunsEnabled(
                        event.target.checked
                      )
                    }
                    className="h-4 w-4"
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={
            loading ||
            tournaments.length === 0 ||
            tournamentTeams.length < 2
          }
          className="w-full rounded-lg bg-white px-4 py-3 font-semibold text-slate-950 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? "Creating..."
            : "Create Match"}
        </button>

        {error && (
          <p className="text-sm text-red-400">
            {error}
          </p>
        )}
      </form>
    </section>
  );
}