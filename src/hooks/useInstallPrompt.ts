import { useState, useEffect } from "react";

type Platform = "android" | "ios" | "unsupported";

interface InstallPromptState {
  platform: Platform;
  isInstallable: boolean;
  isInstalled: boolean;
  triggerInstall: () => Promise<boolean>;
  dismiss: () => void;
  isDismissed: boolean;
}

const DISMISS_KEY = "pwa-install-dismissed";

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  const isIOS = /iphone|ipad|ipod/i.test(ua);
  const isAndroid = /android/i.test(ua);
  if (isIOS) return "ios";
  if (isAndroid) return "android";
  return "unsupported";
}

function isRunningStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true
  );
}

export function useInstallPrompt(): InstallPromptState {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(isRunningStandalone);
  const [isDismissed, setIsDismissed] = useState(
    () => sessionStorage.getItem(DISMISS_KEY) === "true"
  );

  const platform = detectPlatform();

  useEffect(() => {
    if (isRunningStandalone()) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handler);

    const installed = () => setIsInstalled(true);
    window.addEventListener("appinstalled", installed);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);

  const triggerInstall = async (): Promise<boolean> => {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    return outcome === "accepted";
  };

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, "true");
    setIsDismissed(true);
  };

  // Android: installable when deferredPrompt captured
  // iOS: always "installable" via manual steps (Safari only)
  const isSafariIOS =
    platform === "ios" && /safari/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);

  const isInstallable =
    !isInstalled &&
    !isDismissed &&
    (platform === "android" ? !!deferredPrompt : isSafariIOS);

  return { platform, isInstallable, isInstalled, triggerInstall, dismiss, isDismissed };
}