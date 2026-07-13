import { useEffect, useState } from "react";

const DESKTOP_QUERY = "(min-width: 1024px)";

function getInitialIsDesktop(): boolean | null {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return null;
  }

  return window.matchMedia(DESKTOP_QUERY).matches;
}

/** Synchronously reflects the current desktop breakpoint on the client. */
export function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState<boolean | null>(getInitialIsDesktop);

  useEffect(() => {
    const media = window.matchMedia(DESKTOP_QUERY);
    const update = () => setIsDesktop(media.matches);

    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return isDesktop;
}
