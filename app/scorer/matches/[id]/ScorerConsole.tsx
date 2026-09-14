"use client";

import { useState } from "react";

type ScorerConsoleProps = {
  homeTeamName: string;
  awayTeamName: string;
};

export default function ScorerConsole({
  homeTeamName,
  awayTeamName,
}: ScorerConsoleProps) {
  const [score, setScore] = useState(0);
  const [wickets, setWickets] = useState(0);
  const [balls, setBalls] = useState(0);

  const [lastAction, setLastAction] = useState(
    "No delivery recorded yet."
  );

  function recordRuns(runs: number) {
    setScore((current) => current + runs);

    setBalls((current) => current + 1);

    setLastAction(
      runs === 0
        ? "Dot ball"
        : `${runs} run${runs !== 1 ? "s" : ""}`
    );
  }

  function recordExtra(
    type: "WIDE" | "NO BALL" | "BYE" | "LEG BYE"
  ) {
    setScore((current) => current + 1);

    if (type === "WIDE" || type === "NO BALL") {
      setLastAction(`${type} + 1 run`);
    } else {
      setBalls((current) => current + 1);
      setLastAction(`${type} + 1 run`);
    }
  }

  function recordWicket() {
    setWickets((current) => current + 1);

    setBalls((current) => current + 1);

    setLastAction("WICKET");
  }

  function undoLastBall() {
    setLastAction(
      "Undo will be connected to the delivery history next."
    );
  }

  const completedOvers = Math.floor(balls / 6);
  const currentBall = balls % 6;

  const overs = `${completedOvers}.${currentBall}`;

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

              <p className="mt-2 text-xl font-semibold">
                Select Batsman
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Player setup coming next
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Non-Striker
              </p>

              <p className="mt-2 text-xl font-semibold">
                Select Batsman
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Player setup coming next
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Bowler
            </p>

            <p className="mt-2 text-xl font-semibold">
              Select Bowler
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Bowler setup coming next
            </p>
          </div>

          <div className="mt-8">
            <p className="mb-3 text-sm font-semibold text-slate-300">
              Runs
            </p>

            <div className="grid grid-cols-4 gap-3">
              {[0, 1, 2, 3, 4, 6].map((runs) => (
                <button
                  key={runs}
                  type="button"
                  onClick={() => recordRuns(runs)}
                  className="rounded-xl border border-slate-700 bg-slate-950 py-5 text-xl font-bold transition hover:bg-slate-800 active:scale-95"
                >
                  {runs}
                </button>
              ))}
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
                    recordExtra(
                      type as
                        | "WIDE"
                        | "NO BALL"
                        | "BYE"
                        | "LEG BYE"
                    )
                  }
                  className="rounded-xl border border-slate-700 bg-slate-950 py-4 text-sm font-semibold transition hover:bg-slate-800 active:scale-95"
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={recordWicket}
            className="mt-4 w-full rounded-xl border border-red-900 bg-red-950/30 py-5 text-lg font-bold text-red-300 transition hover:bg-red-950/50 active:scale-95"
          >
            WICKET
          </button>

          <button
            type="button"
            onClick={undoLastBall}
            className="mt-4 w-full rounded-xl border border-slate-700 py-4 text-sm font-semibold text-slate-300 transition hover:bg-slate-800"
          >
            UNDO LAST BALL
          </button>
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
                  {homeTeamName}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Bowling
                </p>

                <p className="mt-1 font-semibold">
                  {awayTeamName}
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