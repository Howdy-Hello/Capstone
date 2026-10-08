import { useEffect } from "react";

const SITE = "StockPilot";

/**
 * Sets the browser tab title for the current page ("Leaderboard · StockPilot")
 * and restores the previous title when the page unmounts (BUG-029).
 */
export function usePageTitle(page?: string) {
  useEffect(() => {
    const previous = document.title;
    document.title = page ? `${page} · ${SITE}` : SITE;
    return () => { document.title = previous; };
  }, [page]);
}

/**
 * Adds <meta name="robots" content="noindex"> while the page is mounted, for
 * pages search engines should not list (BUG-031).
 */
export function useNoIndex() {
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex";
    document.head.appendChild(meta);
    return () => { meta.remove(); };
  }, []);
}
