import { createContext, useContext, useRef } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { toast } from "sonner";
import { useRegisterSW } from "virtual:pwa-register/react";
import type { RegisterSWOptions } from "virtual:pwa-register/react";
import { translate } from "@/core/i18n";

interface PwaUpdateContextValue {
  needRefresh: boolean;
  updateServiceWorker: (reloadPage?: boolean) => Promise<void>;
}

const PwaUpdateContext = createContext<PwaUpdateContextValue | null>(null);

export function PwaUpdateProvider({ children }: { children: ReactNode }) {
  const startupToastShownRef = useRef(false);
  const setNeedRefreshRef = useRef<Dispatch<SetStateAction<boolean>> | null>(null);
  const showStartupUpdatePromptRef = useRef<(() => void) | null>(null);
  const { needRefresh: needRefreshState, updateServiceWorker } = useRegisterSW({
    onRegisteredSW(
      _swScriptUrl: string,
      registration: Parameters<NonNullable<RegisterSWOptions["onRegisteredSW"]>>[1],
    ) {
      if (!registration?.waiting) return;
      if (showStartupUpdatePromptRef.current) {
        showStartupUpdatePromptRef.current();
        return;
      }

      queueMicrotask(() => showStartupUpdatePromptRef.current?.());
    },
  });
  const [needRefresh, setNeedRefresh] = needRefreshState;
  setNeedRefreshRef.current = setNeedRefresh;
  const showUpdateToast = () => {
    setNeedRefreshRef.current?.(true);
    toast(translate("settings.updateReadyTitle"), {
      description: translate("settings.updateReadyBody"),
      duration: Infinity,
      action: {
        label: translate("settings.updateAction"),
        onClick: () => {
          void updateServiceWorker(true);
        },
      },
    });
  };

  showStartupUpdatePromptRef.current = () => {
    if (startupToastShownRef.current) return;

    startupToastShownRef.current = true;
    showUpdateToast();
  };

  return (
    <PwaUpdateContext.Provider value={{ needRefresh, updateServiceWorker }}>
      {children}
    </PwaUpdateContext.Provider>
  );
}

export function usePwaUpdate() {
  const context = useContext(PwaUpdateContext);
  if (!context) throw new Error("usePwaUpdate must be used within PwaUpdateProvider");
  return context;
}
