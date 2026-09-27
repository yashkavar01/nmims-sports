import Link from "next/link";
import { notFound } from "next/navigation";

import db from "@/lib/db";
import Commentary from "./Commentary";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

type PlayerInfo = {
  id: string;
  name: string;
  jerseyNo: number | null;
};

type DeliveryInfo = {
  id: string;
  inningsId: string;
  overId: string;
  ballNumber: number;
  legalBall: boolean;
  strikerId: string;
  nonStrikerId: string;
  bowlerId: string;
  runsOffBat: number;
  extras: number;
  totalRuns: number;
  extraType: string | null;
  wicket: boolean;
  wicketType: string | null;
  dismissedPlayerId: string | null;
  data: string | null;
};

type OverInfo = {
  id: string;
  inningsId: string;
  overNumber: number;
  bowlerId: string;
};

type BatterStats = {
  playerId: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  dismissal: string;
};

type BowlerStats = {
  playerId: string;
  legalBalls: number;
  runs: number;
  wickets: number;
};

function formatOvers(legalBalls: number) {
  return `${Math.floor(legalBalls / 6)}.${legalBalls % 6}`;
}

function strikeRate(runs: number, balls: number) {
  if (balls === 0) {
    return "0.00";
  }

  return ((runs / balls) * 100).toFixed(2);
}

function economy(runs: number, legalBalls: number) {
  if (legalBalls === 0) {
    return "0.00";
  }

  return ((runs / legalBalls) * 6).toFixed(2);
}

function getDismissalText(
  wicketType: string | null,
  bowlerName: string
) {
  if (!wicketType) {
    return "Not Out";
  }

  const formatted = wicketType
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

  if (
    wicketType === "BOWLED" ||
    wicketType === "LBW" ||
    wicketType === "STUMPED" ||
    wicketType === "HIT_WICKET"
  ) {
    return `${formatted} b ${bowlerName}`;
  }

  if (wicketType === "CAUGHT") {
    return `Caught b ${bowlerName}`;
  }

  if (wicketType === "RUN_OUT") {
    return "Run Out";
  }

  return formatted;
}

function getPlayerName(
  players: Map<string, PlayerInfo>,
  playerId: string
) {
  return players.get(playerId)?.name ?? "Unknown Player";
}

export default async function ScorecardPage({
  params,
}: PageProps) {
  const { id } = await params;

  const match = await db.orm.public.Match
    .where({
      id,
    })
    .first();

  if (!match) {
    notFound();
  }

  const [
    sport,
    tournament,
    homeTeam,
    awayTeam,
    config,
    innings,
    matchPlayers,
    allPlayers,
    allUsers,
  ] = await Promise.all([
    db.orm.public.Sport
      .where({
        id: match.sportId,
      })
      .first(),

    match.tournamentId
      ? db.orm.public.Tournament
          .where({
            id: match.tournamentId,
          })
          .first()
      : Promise.resolve(null),

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

    db.orm.public.CricketMatchConfig
      .where({
        matchId: match.id,
      })
      .first(),

    db.orm.public.CricketInnings
      .where({
        matchId: match.id,
      })
      .all(),

    db.orm.public.MatchPlayer
      .where({
        matchId: match.id,
      })
      .all(),

    db.orm.public.Player.all(),

    db.orm.public.User.all(),
  ]);

  if (!homeTeam || !awayTeam) {
    notFound();
  }

  if (
    !sport ||
    sport.name.toLowerCase() !== "cricket"
  ) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-white md:p-10">
        <div className="mx-auto max-w-5xl">
          <Link
            href={`/matches/${match.id}`}
            className="text-sm text-slate-400 transition hover:text-white"
          >
            â† Back to Match
          </Link>

          <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-8">
            <h1 className="text-2xl font-bold">
              Cricket Scorecard
            </h1>

            <p className="mt-3 text-slate-400">
              Scorecards are currently available for
              cricket matches only.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const playerMap = new Map<string, PlayerInfo>();

  for (const player of allPlayers) {
    const user = allUsers.find(
      (item) => item.id === player.userId
    );

    playerMap.set(player.id, {
      id: player.id,
      name: user?.name ?? "Unknown Player",
      jerseyNo: player.jerseyNo,
    });
  }

  const scorecardInnings = [...innings].sort(
    (a, b) =>
      a.inningsNumber - b.inningsNumber
  );

  const inningsData = await Promise.all(
    scorecardInnings.map(async (inning) => {
      const [overs, deliveries] =
        await Promise.all([
          db.orm.public.CricketOver
            .where({
              inningsId: inning.id,
            })
            .all(),

          db.orm.public.CricketDelivery
            .where({
              inningsId: inning.id,
            })
            .all(),
        ]);

      const sortedOvers = [...overs].sort(
        (a, b) =>
          a.overNumber - b.overNumber
      );

      const overNumberMap = new Map<
        string,
        number
      >();

      for (const over of sortedOvers) {
        overNumberMap.set(
          over.id,
          over.overNumber
        );
      }

      const sortedDeliveries = [
        ...deliveries,
      ].sort((a, b) => {
        const overA =
          overNumberMap.get(a.overId) ?? 0;

        const overB =
          overNumberMap.get(b.overId) ?? 0;

        if (overA !== overB) {
          return overA - overB;
        }

        return a.ballNumber - b.ballNumber;
      });

      return {
        inning,
        overs: sortedOvers,
        deliveries: sortedDeliveries,
      };
    })
  );

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white md:p-10">
      <div className="mx-auto max-w-7xl">
        <Link
          href={`/matches/${match.id}`}
          className="text-sm text-slate-400 transition hover:text-white"
        >
          â† Back to Match
        </Link>

        <header className="mt-6 rounded-3xl border border-slate-800 bg-slate-900 p-6 md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-400">
                NMIMS Sports Hub
              </p>

              <h1 className="mt-3 text-3xl font-bold md:text-4xl">
                {homeTeam.name}
                <span className="mx-3 text-slate-600">
                  vs
                </span>
                {awayTeam.name}
              </h1>

              <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-400">
                <span>{sport.name}</span>

                {tournament && (
                  <>
                    <span>â€¢</span>
                    <span>{tournament.name}</span>
                  </>
                )}

                {match.round && (
                  <>
                    <span>â€¢</span>
                    <span>{match.round}</span>
                  </>
                )}

                {match.matchNumber && (
                  <>
                    <span>â€¢</span>
                    <span>
                      Match #{match.matchNumber}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <span className="rounded-full border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-medium">
                {match.status}
              </span>

              {match.venue && (
                <span className="rounded-full border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-slate-300">
                  {match.venue}
                </span>
              )}
            </div>
          </div>

          {match.result && (
            <div className="mt-6 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
                Result
              </p>

              <p className="mt-2 text-lg font-semibold">
                {match.result}
              </p>
            </div>
          )}
        </header>

        {inningsData.length === 0 && (
          <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-8">
            <h2 className="text-2xl font-bold">
              No innings yet
            </h2>

            <p className="mt-2 text-slate-400">
              The scorecard will appear once scoring
              begins.
            </p>
          </section>
        )}

        <div className="mt-8 space-y-10">
          {inningsData.map(
            ({
              inning,
              overs,
              deliveries,
            }) => {
              const battingTeam =
                inning.battingTeamId ===
                homeTeam.id
                  ? homeTeam
                  : awayTeam;

              const bowlingTeam =
                inning.bowlingTeamId ===
                homeTeam.id
                  ? homeTeam
                  : awayTeam;

              const battingPlayers =
                matchPlayers
                  .filter(
                    (player) =>
                      player.teamId ===
                        inning.battingTeamId &&
                      player.role === "PLAYING"
                  )
                  .map(
                    (player) =>
                      player.playerId
                  );

              const batterStats =
                new Map<
                  string,
                  BatterStats
                >();

              for (const playerId of battingPlayers) {
                batterStats.set(
                  playerId,
                  {
                    playerId,
                    runs: 0,
                    balls: 0,
                    fours: 0,
                    sixes: 0,
                    dismissal: "Not Out",
                  }
                );
              }

              const bowlerStats =
                new Map<
                  string,
                  BowlerStats
                >();

              for (const over of overs) {
                if (!bowlerStats.has(over.bowlerId)) {
                  bowlerStats.set(
                    over.bowlerId,
                    {
                      playerId:
                        over.bowlerId,
                      legalBalls: 0,
                      runs: 0,
                      wickets: 0,
                    }
                  );
                }
              }

              for (const delivery of deliveries) {
                const batter =
                  batterStats.get(
                    delivery.strikerId
                  );

                if (batter) {
                  batter.runs +=
                    delivery.runsOffBat;

                  if (delivery.legalBall) {
                    batter.balls += 1;
                  }

                  if (
                    delivery.runsOffBat === 4
                  ) {
                    batter.fours += 1;
                  }

                  if (
                    delivery.runsOffBat === 6
                  ) {
                    batter.sixes += 1;
                  }
                }

                if (!bowlerStats.has(delivery.bowlerId)) {
                  bowlerStats.set(
                    delivery.bowlerId,
                    {
                      playerId:
                        delivery.bowlerId,
                      legalBalls: 0,
                      runs: 0,
                      wickets: 0,
                    }
                  );
                }

                const bowler =
                  bowlerStats.get(
                    delivery.bowlerId
                  );

                if (bowler) {
                  if (delivery.legalBall) {
                    bowler.legalBalls += 1;
                  }

                  if (
                    delivery.extraType !==
                      "BYE" &&
                    delivery.extraType !==
                      "LEG_BYE"
                  ) {
                    bowler.runs +=
                      delivery.totalRuns;
                  }

                  if (
                    delivery.wicket &&
                    delivery.wicketType !== "RUN_OUT"
                  ) {
                    bowler.wickets += 1;
                  }
                }

                if (
                  delivery.wicket &&
                  delivery.dismissedPlayerId
                ) {
                  const dismissed =
                    batterStats.get(
                      delivery.dismissedPlayerId
                    );

                  if (dismissed) {
                    dismissed.dismissal =
                      getDismissalText(
                        delivery.wicketType,
                        getPlayerName(
                          playerMap,
                          delivery.bowlerId
                        )
                      );
                  }
                }
              }

              const orderedBatters =
                battingPlayers
                  .map(
                    (playerId) =>
                      batterStats.get(
                        playerId
                      )
                  )
                  .filter(
                    (
                      player
                    ): player is BatterStats =>
                      Boolean(player)
                  );

              const orderedBowlers =
                Array.from(
                  bowlerStats.values()
                );

              const commentaryDeliveries = deliveries.map(
                (delivery) => ({
                  id: delivery.id,
                  overNumber:
                    overs.find(
                      (over) => over.id === delivery.overId
                    )?.overNumber ?? 0,
                  ballNumber: delivery.ballNumber,
                  strikerName: getPlayerName(
                    playerMap,
                    delivery.strikerId
                  ),
                  bowlerName: getPlayerName(
                    playerMap,
                    delivery.bowlerId
                  ),
                  runsOffBat: delivery.runsOffBat,
                  extras: delivery.extras,
                  totalRuns: delivery.totalRuns,
                  extraType: delivery.extraType,
                  wicket: delivery.wicket,
                  wicketType: delivery.wicketType,
                  dismissedPlayerName:
                    delivery.dismissedPlayerId
                      ? getPlayerName(
                          playerMap,
                          delivery.dismissedPlayerId
                        )
                      : null,
                })
              );

              const requiredRuns =
                inning.target !== null
                  ? Math.max(
                      0,
                      inning.target -
                        inning.runs
                    )
                  : null;

              return (
                <section
                  key={inning.id}
                  className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900"
                >
                  <div className="border-b border-slate-800 bg-slate-950/60 p-6">
                    <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">
                          Innings{" "}
                          {inning.inningsNumber}
                        </p>

                        <h2 className="mt-2 text-2xl font-bold">
                          {battingTeam.name}
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                          Batting vs{" "}
                          {bowlingTeam.name}
                        </p>
                      </div>

                      <div className="text-left md:text-right">
                        <p className="text-4xl font-bold">
                          {inning.runs}/
                          {inning.wickets}
                        </p>

                        <p className="mt-1 text-sm text-slate-400">
                          {formatOvers(
                            inning.legalBalls
                          )}{" "}
                          overs
                        </p>
                      </div>
                    </div>

                    {inning.target !== null && (
                      <div className="mt-5 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-xl bg-slate-900 p-4">
                          <p className="text-xs text-slate-500">
                            Target
                          </p>

                          <p className="mt-1 text-xl font-bold">
                            {inning.target}
                          </p>
                        </div>

                        <div className="rounded-xl bg-slate-900 p-4">
                          <p className="text-xs text-slate-500">
                            Required
                          </p>

                          <p className="mt-1 text-xl font-bold">
                            {requiredRuns}
                          </p>
                        </div>

                        <div className="rounded-xl bg-slate-900 p-4">
                          <p className="text-xs text-slate-500">
                            Status
                          </p>

                          <p className="mt-1 text-xl font-bold">
                            {inning.status}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-6">
                    <div>
                      <div className="mb-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                          Batting
                        </p>

                        <h3 className="mt-2 text-xl font-bold">
                          {battingTeam.name}
                        </h3>
                      </div>

                      <div className="overflow-x-auto rounded-2xl border border-slate-800">
                        <table className="w-full min-w-[760px] text-sm">
                          <thead className="bg-slate-950 text-xs uppercase tracking-wider text-slate-500">
                            <tr>
                              <th className="px-4 py-4 text-left">
                                Batter
                              </th>

                              <th className="px-4 py-4 text-left">
                                Dismissal
                              </th>

                              <th className="px-4 py-4 text-right">
                                R
                              </th>

                              <th className="px-4 py-4 text-right">
                                B
                              </th>

                              <th className="px-4 py-4 text-right">
                                4s
                              </th>

                              <th className="px-4 py-4 text-right">
                                6s
                              </th>

                              <th className="px-4 py-4 text-right">
                                SR
                              </th>
                            </tr>
                          </thead>

                          <tbody>
                            {orderedBatters.map(
                              (batter) => (
                                <tr
                                  key={
                                    batter.playerId
                                  }
                                  className="border-t border-slate-800"
                                >
                                  <td className="px-4 py-4 font-semibold">
                                    {getPlayerName(
                                      playerMap,
                                      batter.playerId
                                    )}
                                  </td>

                                  <td className="px-4 py-4 text-slate-400">
                                    {
                                      batter.dismissal
                                    }
                                  </td>

                                  <td className="px-4 py-4 text-right font-bold">
                                    {
                                      batter.runs
                                    }
                                  </td>

                                  <td className="px-4 py-4 text-right">
                                    {
                                      batter.balls
                                    }
                                  </td>

                                  <td className="px-4 py-4 text-right">
                                    {
                                      batter.fours
                                    }
                                  </td>

                                  <td className="px-4 py-4 text-right">
                                    {
                                      batter.sixes
                                    }
                                  </td>

                                  <td className="px-4 py-4 text-right">
                                    {strikeRate(
                                      batter.runs,
                                      batter.balls
                                    )}
                                  </td>
                                </tr>
                              )
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="mt-10">
                      <div className="mb-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                          Bowling
                        </p>

                        <h3 className="mt-2 text-xl font-bold">
                          {bowlingTeam.name}
                        </h3>
                      </div>

                      <div className="overflow-x-auto rounded-2xl border border-slate-800">
                        <table className="w-full min-w-[620px] text-sm">
                          <thead className="bg-slate-950 text-xs uppercase tracking-wider text-slate-500">
                            <tr>
                              <th className="px-4 py-4 text-left">
                                Bowler
                              </th>

                              <th className="px-4 py-4 text-right">
                                O
                              </th>

                              <th className="px-4 py-4 text-right">
                                R
                              </th>

                              <th className="px-4 py-4 text-right">
                                W
                              </th>

                              <th className="px-4 py-4 text-right">
                                ECO
                              </th>
                            </tr>
                          </thead>

                          <tbody>
                            {orderedBowlers.map(
                              (bowler) => (
                                <tr
                                  key={
                                    bowler.playerId
                                  }
                                  className="border-t border-slate-800"
                                >
                                  <td className="px-4 py-4 font-semibold">
                                    {getPlayerName(
                                      playerMap,
                                      bowler.playerId
                                    )}
                                  </td>

                                  <td className="px-4 py-4 text-right">
                                    {formatOvers(
                                      bowler.legalBalls
                                    )}
                                  </td>

                                  <td className="px-4 py-4 text-right">
                                    {
                                      bowler.runs
                                    }
                                  </td>

                                  <td className="px-4 py-4 text-right font-bold">
                                    {
                                      bowler.wickets
                                    }
                                  </td>

                                  <td className="px-4 py-4 text-right">
                                    {economy(
                                      bowler.runs,
                                      bowler.legalBalls
                                    )}
                                  </td>
                                </tr>
                              )
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="mt-10">
                      <div className="mb-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                          Innings Summary
                        </p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-xl bg-slate-950 p-4">
                          <p className="text-xs text-slate-500">
                            Total
                          </p>

                          <p className="mt-1 text-2xl font-bold">
                            {inning.runs}/
                            {inning.wickets}
                          </p>
                        </div>

                        <div className="rounded-xl bg-slate-950 p-4">
                          <p className="text-xs text-slate-500">
                            Overs
                          </p>

                          <p className="mt-1 text-2xl font-bold">
                            {formatOvers(
                              inning.legalBalls
                            )}
                          </p>
                        </div>

                        <div className="rounded-xl bg-slate-950 p-4">
                          <p className="text-xs text-slate-500">
                            Run Rate
                          </p>

                          <p className="mt-1 text-2xl font-bold">
                            {inning.legalBalls ===
                            0
                              ? "0.00"
                              : (
                                  (inning.runs /
                                    inning.legalBalls) *
                                  6
                                ).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-10">
                      <div className="mb-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                          Ball-by-Ball Commentary
                        </p>
                        <h3 className="mt-2 text-xl font-bold">
                          Delivery Timeline
                        </h3>
                      </div>

                      <Commentary
                        deliveries={commentaryDeliveries}
                      />
                    </div>
                  </div>
                </section>
              );
            }
          )}
        </div>

        {config && (
          <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-400">
            {config.format} â€¢ {config.overs} overs â€¢{" "}
            {config.playersPerTeam} players per team
          </div>
        )}
      </div>
    </main>
  );
}