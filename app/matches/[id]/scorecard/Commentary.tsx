"use client";

type CommentaryDelivery = {
  id: string;
  overNumber: number;
  ballNumber: number;
  strikerName: string;
  bowlerName: string;
  runsOffBat: number;
  extras: number;
  totalRuns: number;
  extraType: string | null;
  wicket: boolean;
  wicketType: string | null;
  dismissedPlayerName: string | null;
};

type CommentaryProps = {
  deliveries: CommentaryDelivery[];
};

function formatWicketType(
  wicketType: string | null
) {
  if (!wicketType) {
    return "Wicket";
  }

  return wicketType
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) =>
      char.toUpperCase()
    );
}

function getCommentaryText(
  delivery: CommentaryDelivery
) {
  if (delivery.wicket) {
    const wicketText = formatWicketType(
      delivery.wicketType
    );

    if (
      delivery.wicketType === "RUN_OUT" &&
      delivery.totalRuns > 0
    ) {
      return `${delivery.strikerName} — ${delivery.totalRuns} run${
        delivery.totalRuns !== 1 ? "s" : ""
      } + OUT (${wicketText})`;
    }

    return `${delivery.dismissedPlayerName ?? delivery.strikerName} OUT — ${wicketText}`;
  }

  if (delivery.extraType === "NO_BALL") {
    if (delivery.runsOffBat > 0) {
      return `NO BALL + ${delivery.runsOffBat} run${
        delivery.runsOffBat !== 1 ? "s" : ""
      }`;
    }

    return "NO BALL";
  }

  if (delivery.extraType === "WIDE") {
    return `WIDE +${delivery.totalRuns}`;
  }

  if (delivery.extraType === "BYE") {
    return `BYE — ${delivery.totalRuns} run${
      delivery.totalRuns !== 1 ? "s" : ""
    }`;
  }

  if (delivery.extraType === "LEG_BYE") {
    return `LEG BYE — ${delivery.totalRuns} run${
      delivery.totalRuns !== 1 ? "s" : ""
    }`;
  }

  if (delivery.runsOffBat === 0) {
    return "Dot ball";
  }

  if (delivery.runsOffBat === 4) {
    return "FOUR";
  }

  if (delivery.runsOffBat === 6) {
    return "SIX";
  }

  return `${delivery.strikerName} — ${delivery.runsOffBat} run${
    delivery.runsOffBat !== 1 ? "s" : ""
  }`;
}

export default function Commentary({
  deliveries,
}: CommentaryProps) {
  if (deliveries.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6">
        <p className="text-sm text-slate-500">
          No deliveries recorded yet.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800">
      <div className="divide-y divide-slate-800">
        {deliveries.map((delivery) => (
          <div
            key={delivery.id}
            className="flex gap-4 bg-slate-950 px-4 py-4 transition hover:bg-slate-900"
          >
            <div className="w-12 shrink-0">
              <span className="inline-flex rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-bold text-slate-300">
                {delivery.overNumber}.
                {delivery.ballNumber}
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white">
                {getCommentaryText(delivery)}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {delivery.bowlerName}
                {" → "}
                {delivery.strikerName}
              </p>
            </div>

            <div className="shrink-0 text-right">
              <span className="text-sm font-bold text-slate-300">
                {delivery.totalRuns}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}