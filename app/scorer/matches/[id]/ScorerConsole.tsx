"use client";

import { useState } from "react";

type Player = {
  id: string;
  name: string;
  jerseyNo: number | null;
};

type DeliveryType =
  | "NORMAL"
  | "WIDE"
  | "NO_BALL"
  | "BYE"
  | "LEG_BYE";

type WicketType =
  | "BOWLED"
  | "CAUGHT"
  | "LBW"
  | "RUN_OUT"
  | "STUMPED"
  | "HIT_WICKET";

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
  const [legalBalls, setLegalBalls] = useState(initialLegalBalls);

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

  const [nextOverOpen, setNextOverOpen] =
    useState(initialOverComplete);

  const [nextBowlerId, setNextBowlerId] =
    useState("");

  const [lastAction, setLastAction] =
    useState(initialLastAction);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [wicketOpen, setWicketOpen] =
    useState(false);

  const [dismissedPlayerId, setDismissedPlayerId] =
    useState("");

  const [dismissedPosition, setDismissedPosition] =
    useState<"STRIKER" | "NON_STRIKER" | "">("");

  const [wicketType, setWicketType] =
    useState<WicketType>("BOWLED");

  const [newBatsmanRequired, setNewBatsmanRequired] =
    useState(false);

  const [newBatsmanId, setNewBatsmanId] =
    useState("");

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

  const overs =
    `${Math.floor(legalBalls / 6)}.${currentBall}`;

  const availableNextBowlers =
    bowlingPlayers.filter(
      (player) => player.id !== bowlerId
    );

  const availableNewBatsmen =
    battingPlayers.filter(
      (player) =>
        player.id !== strikerId &&
        player.id !== nonStrikerId &&
        player.id !== dismissedPlayerId
    );

  async function recordDelivery(
    deliveryType: DeliveryType,
    runsOffBat: number
  ) {
    if (
      saving ||
      overComplete ||
      newBatsmanRequired ||
      nextOverOpen
    ) {
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
            deliveryType,
            runsOffBat,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (
          response.status === 409 &&
          data.overComplete
        ) {
          setOverComplete(true);
          setNextOverOpen(true);
          setError("");
          return;
        }

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
      setNonStrikerId(
        state.nonStrikerId
      );
      setBowlerId(state.bowlerId);
      setOverComplete(
        Boolean(state.overComplete)
      );
      setLastAction(state.lastAction);

      if (state.overComplete) {
        setNextOverOpen(true);
        setNextBowlerId("");
      }
    } catch {
      setError(
        "Unable to connect to the scoring server."
      );
    } finally {
      setSaving(false);
    }
  }

  async function startNextOver() {
    if (!nextBowlerId) {
      setError(
        "Select the bowler for the next over."
      );
      return;
    }

    if (nextBowlerId === bowlerId) {
      setError(
        "A bowler cannot bowl consecutive overs."
      );
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        `/api/scorer/matches/${matchId}/next-over`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            bowlerId: nextBowlerId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error ??
            "Failed to start the next over."
        );
        return;
      }

      const state = data.state;

      setScore(state.score);
      setWickets(state.wickets);
      setLegalBalls(state.legalBalls);
      setOverNumber(state.overNumber);
      setBowlerId(state.bowlerId);
      setOverComplete(false);
      setNextOverOpen(false);
      setNextBowlerId("");
      setLastAction(state.lastAction);
    } catch {
      setError(
        "Unable to connect to the scoring server."
      );
    } finally {
      setSaving(false);
    }
  }

  async function recordWicket() {
    if (
      saving ||
      overComplete ||
      nextOverOpen ||
      newBatsmanRequired
    ) {
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

    if (!dismissedPlayerId) {
      setError(
        "Select the dismissed batsman."
      );
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        `/api/scorer/matches/${matchId}/wicket`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            dismissedPlayerId,
            wicketType,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (
          response.status === 409 &&
          data.overComplete
        ) {
          setOverComplete(true);
          setNextOverOpen(true);
          setError("");
          return;
        }

        setError(
          data.error ??
            "Failed to record wicket."
        );
        return;
      }

      const state = data.state;

      setScore(state.score);
      setWickets(state.wickets);
      setLegalBalls(state.legalBalls);
      setOverNumber(state.overNumber);
      setStrikerId(state.strikerId);
      setNonStrikerId(
        state.nonStrikerId
      );
      setBowlerId(state.bowlerId);
      setOverComplete(
        Boolean(state.overComplete)
      );
      setLastAction(state.lastAction);

      setNewBatsmanRequired(
        Boolean(state.newBatsmanRequired)
      );

      if (state.overComplete) {
        setNextOverOpen(true);
      }

      setNewBatsmanId("");
      setWicketOpen(false);
    } catch {
      setError(
        "Unable to connect to the scoring server."
      );
    } finally {
      setSaving(false);
    }
  }

  function recordRuns(runs: number) {
    void recordDelivery("NORMAL", runs);
  }

  function recordExtra(
    type: DeliveryType
  ) {
    void recordDelivery(type, 0);
  }

  function openWicketPanel() {
    setError("");

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

    setDismissedPlayerId(strikerId);
    setDismissedPosition("STRIKER");
    setWicketType("BOWLED");
    setWicketOpen(true);
  }

  function confirmNewBatsman() {
    if (!newBatsmanId) {
      setError(
        "Select the new batsman."
      );
      return;
    }

    if (dismissedPosition === "STRIKER") {
      setStrikerId(newBatsmanId);
    } else if (
      dismissedPosition === "NON_STRIKER"
    ) {
      setNonStrikerId(newBatsmanId);
    }

    setNewBatsmanRequired(false);
    setNewBatsmanId("");
    setDismissedPlayerId("");
    setDismissedPosition("");
    setError("");
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

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Striker
              </p>

              <select
                value={strikerId}
                onChange={(event) =>
                  setStrikerId(event.target.value)
                }
                disabled={
                  saving ||
                  overComplete ||
                  nextOverOpen ||
                  newBatsmanRequired
                }
                className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none disabled:opacity-50"
              >
                <option value="">
                  Select Striker
                </option>

                {battingPlayers.map((player) => (
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

              {striker && (
                <p className="mt-2 text-sm text-slate-400">
                  Batting: {striker.name}
                </p>
              )}
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
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
                disabled={
                  saving ||
                  overComplete ||
                  nextOverOpen ||
                  newBatsmanRequired
                }
                className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none disabled:opacity-50"
              >
                <option value="">
                  Select Non-Striker
                </option>

                {battingPlayers.map((player) => (
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
              disabled={
                saving ||
                overComplete ||
                nextOverOpen ||
                newBatsmanRequired
              }
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

          {overComplete && nextOverOpen && (
            <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-5">
              <p className="text-lg font-semibold text-amber-300">
                Over {overNumber} Complete
              </p>

              <p className="mt-1 text-sm text-amber-200/70">
                Select the bowler for the next over.
              </p>

              <select
                value={nextBowlerId}
                onChange={(event) =>
                  setNextBowlerId(
                    event.target.value
                  )
                }
                disabled={saving}
                className="mt-4 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none disabled:opacity-50"
              >
                <option value="">
                  Select Next Bowler
                </option>

                {availableNextBowlers.map(
                  (player) => (
                    <option
                      key={player.id}
                      value={player.id}
                    >
                      {player.name}
                      {player.jerseyNo !== null
                        ? ` (#${player.jerseyNo})`
                        : ""}
                    </option>
                  )
                )}
              </select>

              <button
                type="button"
                onClick={() =>
                  void startNextOver()
                }
                disabled={
                  saving ||
                  !nextBowlerId
                }
                className="mt-4 w-full rounded-lg bg-amber-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                START NEXT OVER
              </button>
            </div>
          )}

          {newBatsmanRequired && (
            <div className="mt-6 rounded-xl border border-blue-500/30 bg-blue-500/10 p-5">
              <p className="font-semibold text-blue-300">
                New Batsman Required
              </p>

              <p className="mt-1 text-sm text-blue-200/70">
                Select the replacement batsman
                before recording the next delivery.
              </p>

              <select
                value={newBatsmanId}
                onChange={(event) =>
                  setNewBatsmanId(
                    event.target.value
                  )
                }
                disabled={saving}
                className="mt-4 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none disabled:opacity-50"
              >
                <option value="">
                  Select New Batsman
                </option>

                {availableNewBatsmen.map(
                  (player) => (
                    <option
                      key={player.id}
                      value={player.id}
                    >
                      {player.name}
                      {player.jerseyNo !== null
                        ? ` (#${player.jerseyNo})`
                        : ""}
                    </option>
                  )
                )}
              </select>

              <button
                type="button"
                onClick={confirmNewBatsman}
                disabled={
                  saving ||
                  !newBatsmanId
                }
                className="mt-4 w-full rounded-lg bg-blue-500 px-4 py-3 font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                CONFIRM NEW BATSMAN
              </button>
            </div>
          )}

          {!overComplete &&
            !newBatsmanRequired && (
              <>
                <div className="mt-6">
                  <p className="text-sm font-semibold text-slate-300">
                    Runs
                  </p>

                  <div className="mt-3 grid grid-cols-6 gap-3">
                    {[0, 1, 2, 3, 4, 6].map(
                      (runs) => (
                        <button
                          key={runs}
                          type="button"
                          onClick={() =>
                            recordRuns(runs)
                          }
                          disabled={saving}
                          className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-4 text-lg font-semibold transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {runs}
                        </button>
                      )
                    )}
                  </div>
                </div>

                <div className="mt-6">
                  <p className="text-sm font-semibold text-slate-300">
                    Extras
                  </p>

                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        recordExtra("WIDE")
                      }
                      disabled={saving}
                      className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-4 font-semibold transition hover:border-slate-500 disabled:opacity-50"
                    >
                      WIDE
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        recordExtra("NO_BALL")
                      }
                      disabled={saving}
                      className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-4 font-semibold transition hover:border-slate-500 disabled:opacity-50"
                    >
                      NO BALL
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        recordExtra("BYE")
                      }
                      disabled={saving}
                      className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-4 font-semibold transition hover:border-slate-500 disabled:opacity-50"
                    >
                      BYE
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        recordExtra("LEG_BYE")
                      }
                      disabled={saving}
                      className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-4 font-semibold transition hover:border-slate-500 disabled:opacity-50"
                    >
                      LEG BYE
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={openWicketPanel}
                  disabled={saving}
                  className="mt-6 w-full rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-4 font-semibold text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
                >
                  WICKET
                </button>
              </>
            )}

          {wicketOpen && (
            <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-5">
              <p className="font-semibold text-red-300">
                Record Wicket
              </p>

              <div className="mt-4">
                <label className="text-xs uppercase tracking-wide text-slate-500">
                  Dismissed Batsman
                </label>

                <select
                  value={dismissedPlayerId}
                  onChange={(event) => {
                    const value =
                      event.target.value;

                    setDismissedPlayerId(value);

                    if (value === strikerId) {
                      setDismissedPosition(
                        "STRIKER"
                      );
                    } else if (
                      value === nonStrikerId
                    ) {
                      setDismissedPosition(
                        "NON_STRIKER"
                      );
                    }
                  }}
                  disabled={saving}
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none disabled:opacity-50"
                >
                  <option value="">
                    Select Dismissed Batsman
                  </option>

                  <option value={strikerId}>
                    {striker?.name ?? "Striker"}
                  </option>

                  <option value={nonStrikerId}>
                    {nonStriker?.name ??
                      "Non-Striker"}
                  </option>
                </select>
              </div>

              <div className="mt-4">
                <label className="text-xs uppercase tracking-wide text-slate-500">
                  Wicket Type
                </label>

                <select
                  value={wicketType}
                  onChange={(event) =>
                    setWicketType(
                      event.target
                        .value as WicketType
                    )
                  }
                  disabled={saving}
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none disabled:opacity-50"
                >
                  <option value="BOWLED">
                    Bowled
                  </option>

                  <option value="CAUGHT">
                    Caught
                  </option>

                  <option value="LBW">
                    LBW
                  </option>

                  <option value="RUN_OUT">
                    Run Out
                  </option>

                  <option value="STUMPED">
                    Stumped
                  </option>

                  <option value="HIT_WICKET">
                    Hit Wicket
                  </option>
                </select>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() =>
                    void recordWicket()
                  }
                  disabled={
                    saving ||
                    !dismissedPlayerId
                  }
                  className="rounded-lg bg-red-500 px-4 py-3 font-semibold text-white transition hover:bg-red-400 disabled:opacity-50"
                >
                  CONFIRM WICKET
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setWicketOpen(false)
                  }
                  disabled={saving}
                  className="rounded-lg border border-slate-700 px-4 py-3 font-semibold text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
                >
                  CANCEL
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
              {error}
            </div>
          )}

          {!nextOverOpen &&
            !newBatsmanRequired &&
            !wicketOpen && (
              <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">
                Legal balls: {legalBalls}
              </div>
            )}
        </section>

        <aside className="space-y-6">
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

      <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          Current Innings
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <div className="rounded-xl bg-slate-950 p-4">
            <p className="text-xs text-slate-500">
              Batting
            </p>

            <p className="mt-1 font-semibold">
              {battingTeamName}
            </p>
          </div>

          <div className="rounded-xl bg-slate-950 p-4">
            <p className="text-xs text-slate-500">
              Score
            </p>

            <p className="mt-1 text-2xl font-bold">
              {score}/{wickets}
            </p>
          </div>

          <div className="rounded-xl bg-slate-950 p-4">
            <p className="text-xs text-slate-500">
              Legal Balls
            </p>

            <p className="mt-1 text-2xl font-bold">
              {legalBalls}
            </p>
          </div>

          <div className="rounded-xl bg-slate-950 p-4">
            <p className="text-xs text-slate-500">
              Current Over
            </p>

            <p className="mt-1 text-2xl font-bold">
              {overs}
            </p>
          </div>
        </div>

        <div className="mt-4 text-sm text-slate-500">
          Bowling: {bowlingTeamName}
        </div>
      </section>
    </section>
  );
}