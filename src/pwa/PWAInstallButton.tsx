import { useState } from 'react';
import { Download, WifiOff } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from './usePWAInstall';
import './pwa.css';

type PWAInstallButtonProps = {
  label?: string;
  appName?: string;
  variant?: 'storefront' | 'seller' | 'seller-rail' | 'landing' | 'landing-light' | 'drawer' | 'footer' | 'floating';
  className?: string;
  showFallback?: boolean;
};

export function PWAInstallButton({
  label = 'Install App',
  appName = 'DASMARKET',
  variant = 'storefront',
  className = '',
  showFallback = false,
}: PWAInstallButtonProps) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [installMessage, setInstallMessage] = useState('');
  if (isInstalled) return null;
  if (!isInstallable && !isIOS && !showFallback) return null;

  const handleClick = async () => {
    setInstallMessage('');
    if (!isInstallable) {
      const ua = navigator.userAgent.toLowerCase();
      const isAndroid = /android/.test(ua);
      const isEmbeddedBrowser = /; wv\)|\bwv\b|fban|fbav|instagram|tiktok|line\//i.test(ua);
      if (isAndroid && isEmbeddedBrowser) {
        const target = window.location.href.replace(/^https?:\/\//, '');
        const fallback = encodeURIComponent(window.location.href);
        window.location.href = `intent://${target}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${fallback};end`;
        return;
      }
      setInstallMessage(isIOS
        ? 'iOS does not allow websites to open the install prompt automatically.'
        : 'Your browser has not provided its native install prompt yet.');
      return;
    }
    const outcome = await install();
    if (outcome === 'dismissed') setInstallMessage('Installation was cancelled.');
    else if (outcome === 'accepted') setInstallMessage('Complete the installation in your browser if it asks for confirmation.');
    else if (outcome === 'unavailable') setInstallMessage('The browser install prompt is not ready yet. Open this shop in Chrome and try again.');
  };

  const buttonClass = [
    'dm-pwa-btn',
    `dm-pwa-btn--${variant}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      <button
        type="button"
        className={buttonClass}
        onClick={handleClick}
        aria-label={`${label} (${appName})`}
        data-testid={`pwa-install-${variant}`}
      >
        <Download size={variant === 'storefront' ? 12 : 15} />
        <span className={variant === 'seller' ? 'dm-pwa-label-hide-xs' : undefined}>{label}</span>
      </button>
      {installMessage && <span className="dm-pwa-install-status" role="status" aria-live="polite">{installMessage}</span>}
    </>
  );
}

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div className="dm-pwa-offline-banner" role="status" aria-live="polite">
      <WifiOff size={15} />
      <span>You are offline — showing saved content</span>
    </div>
  );
}
