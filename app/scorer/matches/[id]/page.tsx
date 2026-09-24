import db from "../../../../lib/db";

import OpeningSetup from "./OpeningSetup";
import ScorerConsole from "./ScorerConsole";

type Player = {
  id: string;
  name: string;
  jerseyNo: number | null;
};

type OpeningState = {
  inningsId: string;
  overId: string;
  overNumber: number;
  strikerId: string;
  nonStrikerId: string;
  bowlerId: string;
  score: number;
  wickets: number;
  legalBalls: number;
  overComplete: boolean;
  lastAction: string;
};

type ScorerMatchPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ScorerMatchPage({
  params,
}: ScorerMatchPageProps) {
  const { id } = await params;

  const scorer = await db.orm.public.User
    .where({
      email: "scorer@nmims.local",
    })
    .first();

  if (!scorer || scorer.role !== "SCORER") {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-white md:p-10">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm text-slate-400">
            NMIMS Sports Hub
          </p>

          <h1 className="mt-3 text-3xl font-bold">
            Scorer Access
          </h1>

          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-slate-400">
              Scorer account not found.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const match = await db.orm.public.Match
    .where({
      id,
    })
    .first();

  if (!match) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-white md:p-10">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm text-slate-400">
            NMIMS Sports Hub
          </p>

          <h1 className="mt-3 text-3xl font-bold">
            Match Not Found
          </h1>

          <p className="mt-2 text-slate-400">
            This match does not exist.
          </p>
        </div>
      </main>
    );
  }

  const assignment =
    await db.orm.public.MatchScorerAssignment
      .where({
        matchId: match.id,
        scorerId: scorer.id,
      })
      .first();

  if (
    !assignment ||
    (assignment.status !== "ASSIGNED" &&
      assignment.status !== "ACTIVE")
  ) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-white md:p-10">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm text-slate-400">
            NMIMS Sports Hub
          </p>

          <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-8">
            <h1 className="text-2xl font-bold">
              Access Denied
            </h1>

            <p className="mt-2 text-slate-400">
              You are not assigned as the scorer for
              this match.
            </p>

            <a
              href="/scorer"
              className="mt-6 inline-block rounded-lg bg-white px-5 py-3 font-semibold text-slate-950"
            >
              Back to Scorer Dashboard
            </a>
          </div>
        </div>
      </main>
    );
  }

  const [
    homeTeam,
    awayTeam,
    tournament,
    sport,
    cricketConfig,
    matchPlayers,
    allPlayers,
    allUsers,
    innings,
    overs,
    openingEvents,
    stateEvents,
  ] = await Promise.all([
    db.orm.public.Team
      .where({
        id: match.homeTeamId,
      })
      .first(),

    db.orm.public.Team
      .where({
        id: match.awayTeamId,
      })
      .first(),

    match.tournamentId
      ? db.orm.public.Tournament
          .where({
            id: match.tournamentId,
          })
          .first()
      : Promise.resolve(null),

    db.orm.public.Sport
      .where({
        id: match.sportId,
      })
      .first(),

    db.orm.public.CricketMatchConfig
      .where({
        matchId: match.id,
      })
      .first(),

    db.orm.public.MatchPlayer
      .where({
        matchId: match.id,
      })
      .all(),

    db.orm.public.Player.all(),

    db.orm.public.User.all(),

    db.orm.public.CricketInnings
      .where({
        matchId: match.id,
      })
      .all(),

    db.orm.public.CricketOver
      .where({
        inningsId:
          (
            await db.orm.public.CricketInnings
              .where({
                matchId: match.id,
              })
              .all()
          ).sort(
            (a, b) =>
              b.inningsNumber -
              a.inningsNumber
          )[0]?.id ?? ""
      })
      .all(),

    db.orm.public.MatchEvent
      .where({
        matchId: match.id,
        type: "INNINGS_OPENING_SETUP",
      })
      .all(),

    db.orm.public.MatchEvent
      .where({
        matchId: match.id,
        type: "INNINGS_STATE",
      })
      .all(),
  ]);

  const currentInnings =
    [...innings].sort(
      (a, b) =>
        b.inningsNumber -
        a.inningsNumber
    )[0];

  const currentOver = currentInnings
    ? [...overs].sort(
        (a, b) =>
          b.overNumber -
          a.overNumber
      )[0]
    : null;

  function buildPlayers(
    teamId: string
  ): Player[] {
    return matchPlayers
      .filter(
        (matchPlayer) =>
          matchPlayer.teamId === teamId &&
          matchPlayer.role === "PLAYING"
      )
      .map((matchPlayer) => {
        const player = allPlayers.find(
          (item) =>
            item.id === matchPlayer.playerId
        );

        if (!player) {
          return null;
        }

        const user = allUsers.find(
          (item) =>
            item.id === player.userId
        );

        if (!user) {
          return null;
        }

        return {
          id: player.id,
          name: user.name,
          jerseyNo: player.jerseyNo,
        };
      })
      .filter(
        (player): player is Player =>
          player !== null
      );
  }

  const homePlayers = buildPlayers(
    match.homeTeamId
  );

  const awayPlayers = buildPlayers(
    match.awayTeamId
  );

  let openingState: OpeningState | null =
    null;

  if (currentInnings && currentOver) {
    const matchingStateEvents =
      stateEvents
        .filter((event) => {
          if (!event.data) {
            return false;
          }

          try {
            const data = JSON.parse(
              event.data
            ) as {
              inningsId?: string;
              overId?: string;
            };

            return (
              data.inningsId ===
                currentInnings.id &&
              data.overId ===
                currentOver.id
            );
          } catch {
            return false;
          }
        })
        .sort(
          (a, b) =>
            b.timestamp.epochMilliseconds -
            a.timestamp.epochMilliseconds
        );

    if (matchingStateEvents.length > 0) {
      try {
        const data = JSON.parse(
          matchingStateEvents[0].data ?? "{}"
        ) as Partial<OpeningState>;

        if (
          data.inningsId &&
          data.overId &&
          data.strikerId &&
          data.nonStrikerId &&
          data.bowlerId
        ) {
          openingState = {
            inningsId: data.inningsId,
            overId: data.overId,
            overNumber:
              data.overNumber ??
              currentOver.overNumber,
            strikerId: data.strikerId,
            nonStrikerId:
              data.nonStrikerId,
            bowlerId: data.bowlerId,
            score:
              data.score ??
              currentInnings.runs,
            wickets:
              data.wickets ??
              currentInnings.wickets,
            legalBalls:
              data.legalBalls ??
              currentInnings.legalBalls,
            overComplete:
              data.overComplete ?? false,
            lastAction:
              data.lastAction ??
              "Delivery recorded.",
          };
        }
      } catch {
        openingState = null;
      }
    }
  }

  if (!openingState && currentInnings) {
    const matchingOpeningEvents =
      openingEvents
        .filter((event) => {
          if (!event.data) {
            return false;
          }

          try {
            const data = JSON.parse(
              event.data
            ) as {
              inningsId?: string;
            };

            return (
              data.inningsId ===
              currentInnings.id
            );
          } catch {
            return false;
          }
        })
        .sort(
          (a, b) =>
            b.timestamp.epochMilliseconds -
            a.timestamp.epochMilliseconds
        );

    if (
      matchingOpeningEvents.length > 0
    ) {
      try {
        const data = JSON.parse(
          matchingOpeningEvents[0].data ??
            "{}"
        ) as {
          inningsId?: string;
          overId?: string;
          overNumber?: number;
          strikerId?: string;
          nonStrikerId?: string;
          bowlerId?: string;
        };

        if (
          data.inningsId &&
          data.overId &&
          data.strikerId &&
          data.nonStrikerId &&
          data.bowlerId
        ) {
          openingState = {
            inningsId:
              data.inningsId,
            overId:
              data.overId,
            overNumber:
              data.overNumber ?? 1,
            strikerId:
              data.strikerId,
            nonStrikerId:
              data.nonStrikerId,
            bowlerId:
              data.bowlerId,
            score:
              currentInnings.runs,
            wickets:
              currentInnings.wickets,
            legalBalls:
              currentInnings.legalBalls,
            overComplete: false,
            lastAction:
              "Innings started.",
          };
        }
      } catch {
        openingState = null;
      }
    }
  }

  const battingTeamId =
    currentInnings?.battingTeamId ??
    match.homeTeamId;

  const bowlingTeamId =
    currentInnings?.bowlingTeamId ??
    match.awayTeamId;

  const battingTeamName =
    battingTeamId === match.homeTeamId
      ? homeTeam?.name ?? "Home Team"
      : awayTeam?.name ?? "Away Team";

  const bowlingTeamName =
    bowlingTeamId === match.homeTeamId
      ? homeTeam?.name ?? "Home Team"
      : awayTeam?.name ?? "Away Team";

  const battingPlayers =
    battingTeamId === match.homeTeamId
      ? homePlayers
      : awayPlayers;

  const bowlingPlayers =
    bowlingTeamId === match.homeTeamId
      ? homePlayers
      : awayPlayers;

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white md:p-10">
      <div className="mx-auto max-w-6xl">
        <p className="text-sm text-slate-400">
          NMIMS Sports Hub
        </p>

        <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-slate-500">
              {sport?.name ??
                "Unknown Sport"}
            </p>

            <h1 className="mt-1 text-3xl font-bold">
              Scorer Match Center
            </h1>

            <p className="mt-2 text-slate-400">
              {tournament?.name ??
                "Friendly Match"}
            </p>

            {match.round && (
              <p className="mt-1 text-sm text-slate-500">
                {match.round}
                {match.matchNumber
                  ? ` • Match #${match.matchNumber}`
                  : ""}
              </p>
            )}
          </div>

          <span className="w-fit rounded-full border border-slate-700 px-4 py-2 text-sm">
            {match.status}
          </span>
        </div>

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-8">
          <div className="grid items-center gap-8 md:grid-cols-[1fr_auto_1fr]">
            <div className="text-center md:text-right">
              <p className="text-3xl font-bold">
                {homeTeam?.name ??
                  "Unknown Team"}
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Team A
              </p>
            </div>

            <div className="text-center">
              <p className="text-lg font-bold text-slate-500">
                VS
              </p>
            </div>

            <div className="text-center md:text-left">
              <p className="text-3xl font-bold">
                {awayTeam?.name ??
                  "Unknown Team"}
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Team B
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Assigned Scorer
              </p>

              <p className="mt-1 text-xl font-semibold">
                {scorer.name}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                {scorer.email}
              </p>
            </div>

            <span className="w-fit rounded-full border border-slate-700 px-4 py-2 text-sm">
              AUTHORIZED
            </span>
          </div>
        </section>

        <section className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold">
              {homeTeam?.name ??
                "Team A"}{" "}
              Players
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {homePlayers.length} playing
            </p>

            <div className="mt-5 space-y-2">
              {homePlayers.length === 0 ? (
                <p className="rounded-lg bg-slate-950 p-4 text-sm text-slate-500">
                  No Playing XI players
                  available.
                </p>
              ) : (
                homePlayers.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between rounded-lg bg-slate-950 p-3"
                  >
                    <span className="font-medium">
                      {player.name}
                    </span>

                    <span className="text-sm text-slate-500">
                      {player.jerseyNo !==
                      null
                        ? `#${player.jerseyNo}`
                        : "—"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold">
              {awayTeam?.name ??
                "Team B"}{" "}
              Players
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {awayPlayers.length} playing
            </p>

            <div className="mt-5 space-y-2">
              {awayPlayers.length === 0 ? (
                <p className="rounded-lg bg-slate-950 p-4 text-sm text-slate-500">
                  No Playing XI players
                  available.
                </p>
              ) : (
                awayPlayers.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between rounded-lg bg-slate-950 p-3"
                  >
                    <span className="font-medium">
                      {player.name}
                    </span>

                    <span className="text-sm text-slate-500">
                      {player.jerseyNo !==
                      null
                        ? `#${player.jerseyNo}`
                        : "—"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {match.status === "LIVE" &&
          currentInnings &&
          !openingState &&
          cricketConfig && (
            <OpeningSetup
              matchId={match.id}
              battingTeamName={
                battingTeamName
              }
              bowlingTeamName={
                bowlingTeamName
              }
              battingPlayers={
                battingPlayers
              }
              bowlingPlayers={
                bowlingPlayers
              }
            />
          )}

        {match.status === "LIVE" &&
          currentInnings &&
          openingState && (
            <ScorerConsole
              matchId={match.id}
              battingTeamName={
                battingTeamName
              }
              bowlingTeamName={
                bowlingTeamName
              }
              battingPlayers={
                battingPlayers
              }
              bowlingPlayers={
                bowlingPlayers
              }
              initialScore={
                openingState.score
              }
              initialWickets={
                openingState.wickets
              }
              initialLegalBalls={
                openingState.legalBalls
              }
              initialOverNumber={
                openingState.overNumber
              }
              initialStrikerId={
                openingState.strikerId
              }
              initialNonStrikerId={
                openingState.nonStrikerId
              }
              initialBowlerId={
                openingState.bowlerId
              }
              initialOverComplete={
                openingState.overComplete
              }
              initialLastAction={
                openingState.lastAction
              }
            />
          )}

        {currentInnings && (
          <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
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
                  {currentInnings.runs}/
                  {currentInnings.wickets}
                </p>
              </div>

              <div className="rounded-xl bg-slate-950 p-4">
                <p className="text-xs text-slate-500">
                  Legal Balls
                </p>

                <p className="mt-1 text-2xl font-bold">
                  {currentInnings.legalBalls}
                </p>
              </div>

              <div className="rounded-xl bg-slate-950 p-4">
                <p className="text-xs text-slate-500">
                  Status
                </p>

                <p className="mt-1 font-semibold">
                  {currentInnings.status}
                </p>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}