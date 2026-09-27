"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type LiveRefreshProps = {
  enabled: boolean;
};

export default function LiveRefresh({
  enabled,
}: LiveRefreshProps) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const refresh = () => {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    };

    const interval = window.setInterval(
      refresh,
      3000
    );

    return () => {
      window.clearInterval(interval);
    };
  }, [enabled, router]);

  return null;
}
