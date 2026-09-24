"use client";

import { useState } from "react";

type Player = {
  id: string;
  name: string;
  jerseyNo: number | null;
};

type ScorerConsoleProps = {
  matchId: string;
  battingTeamName: string;
  bowlingTeamName: string;
  battingPlayers: Player[];
  bowlingPlayers: Player[];
  initialScore: number;
  initialWickets: number;
  initialLegalBalls: number;
  initialOverNumber: number;
  initialStrikerId: string;
  initialNonStrikerId: string;
  initialBowlerId: string;
  initialOverComplete: boolean;
  initialLastAction: string;
};

export default function ScorerConsole({
  matchId,
  battingTeamName,
  bowlingTeamName,
  battingPlayers,
  bowlingPlayers,
  initialScore,
  initialWickets,
  initialLegalBalls,
  initialOverNumber,
  initialStrikerId,
  initialNonStrikerId,
  initialBowlerId,
  initialOverComplete,
  initialLastAction,
}: ScorerConsoleProps) {
  const [score, setScore] = useState(initialScore);
  const [wickets, setWickets] = useState(initialWickets);
  const [legalBalls, setLegalBalls] =
    useState(initialLegalBalls);

  const [overNumber, setOverNumber] =
    useState(initialOverNumber);

  const [strikerId, setStrikerId] =
    useState(initialStrikerId);

  const [nonStrikerId, setNonStrikerId] =
    useState(initialNonStrikerId);

  const [bowlerId, setBowlerId] =
    useState(initialBowlerId);

  const [overComplete, setOverComplete] =
    useState(initialOverComplete);

  const [lastAction, setLastAction] =
    useState(initialLastAction);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const striker = battingPlayers.find(
    (player) => player.id === strikerId
  );

  const nonStriker = battingPlayers.find(
    (player) => player.id === nonStrikerId
  );

  const bowler = bowlingPlayers.find(
    (player) => player.id === bowlerId
  );

  const currentBall = legalBalls % 6;

  const overs = `${overNumber - 1}.${currentBall}`;

  async function recordRuns(runs: number) {
    if (saving || overComplete) {
      return;
    }

    if (
      !strikerId ||
      !nonStrikerId ||
      !bowlerId
    ) {
      setError(
        "Striker, non-striker and bowler must be selected."
      );
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        `/api/scorer/matches/${matchId}/delivery`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            strikerId,
            nonStrikerId,
            bowlerId,
            runsOffBat: runs,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error ??
            "Failed to record delivery."
        );
        return;
      }

      const state = data.state;

      setScore(state.score);
      setWickets(state.wickets);
      setLegalBalls(state.legalBalls);
      setOverNumber(state.overNumber);
      setStrikerId(state.strikerId);
      setNonStrikerId(state.nonStrikerId);
      setBowlerId(state.bowlerId);
      setOverComplete(state.overComplete);
      setLastAction(state.lastAction);
    } catch {
      setError(
        "Unable to connect to the scoring server."
      );
    } finally {
      setSaving(false);
    }
  }

  function handleUnsupportedAction(
    action: string
  ) {
    setError(
      `${action} will be connected in the next scoring milestone.`
    );
  }

  return (
    <section className="mt-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="text-center">
            <p className="text-sm uppercase tracking-wide text-slate-500">
              LIVE SCORE
            </p>

            <p className="mt-2 text-5xl font-bold">
              {score}/{wickets}
            </p>

            <p className="mt-2 text-lg text-slate-400">
              {overs} overs
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Striker
              </p>

              <select
                value={strikerId}
                onChange={(event) =>
                  setStrikerId(event.target.value)
                }
                disabled={saving}
                className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none disabled:opacity-50"
              >
                <option value="">
                  Select Batsman
                </option>

                {battingPlayers.map((player) => (
                  <option
                    key={player.id}
                    value={player.id}
                    disabled={
                      player.id ===
                      nonStrikerId
                    }
                  >
                    {player.name}
                    {player.jerseyNo !== null
                      ? ` (#${player.jerseyNo})`
                      : ""}
                  </option>
                ))}
              </select>

              {striker && (
                <p className="mt-2 text-sm text-slate-400">
                  Batting: {striker.name}
                </p>
              )}
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Non-Striker
              </p>

              <select
                value={nonStrikerId}
                onChange={(event) =>
                  setNonStrikerId(
                    event.target.value
                  )
                }
                disabled={saving}
                className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none disabled:opacity-50"
              >
                <option value="">
                  Select Batsman
                </option>

                {battingPlayers.map((player) => (
                  <option
                    key={player.id}
                    value={player.id}
                    disabled={
                      player.id === strikerId
                    }
                  >
                    {player.name}
                    {player.jerseyNo !== null
                      ? ` (#${player.jerseyNo})`
                      : ""}
                  </option>
                ))}
              </select>

              {nonStriker && (
                <p className="mt-2 text-sm text-slate-400">
                  Batting: {nonStriker.name}
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Bowler
            </p>

            <select
              value={bowlerId}
              onChange={(event) =>
                setBowlerId(event.target.value)
              }
              disabled={saving}
              className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none disabled:opacity-50"
            >
              <option value="">
                Select Bowler
              </option>

              {bowlingPlayers.map((player) => (
                <option
                  key={player.id}
                  value={player.id}
                >
                  {player.name}
                  {player.jerseyNo !== null
                    ? ` (#${player.jerseyNo})`
                    : ""}
                </option>
              ))}
            </select>

            {bowler && (
              <p className="mt-2 text-sm text-slate-400">
                Bowling: {bowler.name}
              </p>
            )}
          </div>

          {overComplete && (
            <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-center">
              <p className="font-semibold text-amber-300">
                Over {overNumber} complete
              </p>

              <p className="mt-1 text-sm text-amber-200/70">
                Next-over setup will be added in
                the next scoring milestone.
              </p>
            </div>
          )}

          <div className="mt-8">
            <p className="mb-3 text-sm font-semibold text-slate-300">
              Runs
            </p>

            <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
              {[0, 1, 2, 3, 4, 6].map(
                (runs) => (
                  <button
                    key={runs}
                    type="button"
                    onClick={() =>
                      recordRuns(runs)
                    }
                    disabled={
                      saving ||
                      overComplete
                    }
                    className="rounded-xl border border-slate-700 bg-slate-950 py-5 text-xl font-bold transition hover:bg-slate-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {saving ? "..." : runs}
                  </button>
                )
              )}
            </div>
          </div>

          <div className="mt-8">
            <p className="mb-3 text-sm font-semibold text-slate-300">
              Extras
            </p>

            <div className="grid grid-cols-2 gap-3">
              {[
                "WIDE",
                "NO BALL",
                "BYE",
                "LEG BYE",
              ].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() =>
                    handleUnsupportedAction(
                      type
                    )
                  }
                  disabled={
                    saving ||
                    overComplete
                  }
                  className="rounded-xl border border-slate-700 bg-slate-950 py-4 text-sm font-semibold transition hover:bg-slate-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              handleUnsupportedAction("Wicket")
            }
            disabled={
              saving ||
              overComplete
            }
            className="mt-4 w-full rounded-xl border border-red-900 bg-red-950/30 py-5 text-lg font-bold text-red-300 transition hover:bg-red-950/50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            WICKET
          </button>

          <button
            type="button"
            onClick={() =>
              handleUnsupportedAction(
                "Undo"
              )
            }
            disabled={saving}
            className="mt-4 w-full rounded-xl border border-slate-700 py-4 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            UNDO LAST BALL
          </button>

          {error && (
            <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}
        </section>

        <aside className="space-y-6">
          <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold">
              Current Match
            </h2>

            <div className="mt-5 space-y-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Batting
                </p>

                <p className="mt-1 font-semibold">
                  {battingTeamName}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Bowling
                </p>

                <p className="mt-1 font-semibold">
                  {bowlingTeamName}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Current Over
                </p>

                <p className="mt-1 font-semibold">
                  {overs}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold">
              Current Players
            </h2>

            <div className="mt-5 space-y-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Striker
                </p>

                <p className="mt-1 font-semibold">
                  {striker?.name ??
                    "Not selected"}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Non-Striker
                </p>

                <p className="mt-1 font-semibold">
                  {nonStriker?.name ??
                    "Not selected"}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Bowler
                </p>

                <p className="mt-1 font-semibold">
                  {bowler?.name ??
                    "Not selected"}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold">
              Last Action
            </h2>

            <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950 p-5">
              <p className="text-lg font-semibold">
                {lastAction}
              </p>
            </div>
          </section>

          <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold">
              Today&apos;s Match
            </h2>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-slate-950 p-4">
                <p className="text-xs text-slate-500">
                  Runs
                </p>

                <p className="mt-1 text-2xl font-bold">
                  {score}
                </p>
              </div>

              <div className="rounded-lg bg-slate-950 p-4">
                <p className="text-xs text-slate-500">
                  Wickets
                </p>

                <p className="mt-1 text-2xl font-bold">
                  {wickets}
                </p>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}