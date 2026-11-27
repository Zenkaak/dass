import { useState } from 'react';
import { Download, WifiOff } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from './usePWAInstall';
import './pwa.css';

type PWAInstallButtonProps = {
  label?: string;
  appName?: string;
  variant?: 'storefront' | 'seller' | 'seller-rail' | 'landing' | 'landing-light' | 'drawer' | 'footer';
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
      setInstallMessage(isIOS
        ? 'Direct installation is not supported by iOS. Use the browser’s Add to Home Screen feature.'
        : 'The browser has not made the install prompt available yet. Open this site in Chrome or Edge, then try again.');
      return;
    }
    const outcome = await install();
    if (outcome === 'dismissed') setInstallMessage('Installation was cancelled.');
    else if (outcome === 'unavailable') setInstallMessage('The install prompt is unavailable in this browser.');
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
