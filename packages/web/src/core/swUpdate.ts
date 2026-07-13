/**
 * iOS Safari only checks a service worker for updates on cold launch, not on periodic
 * intervals or background/foreground transitions. Standalone PWAs are frequently resumed
 * from the app switcher rather than cold-launched, so without this the SW update check
 * (and therefore `registerType: 'autoUpdate'`'s auto-apply) may never run for days.
 * Forcing `registration.update()` on every foreground transition closes that gap.
 */
export function registerForegroundSWUpdateCheck() {
  if (!("serviceWorker" in navigator)) return;

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    navigator.serviceWorker.getRegistration().then((registration) => registration?.update());
  });
}
