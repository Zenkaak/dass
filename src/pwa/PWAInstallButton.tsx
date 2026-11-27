import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, MoreVertical, PlusSquare, Share, Smartphone, WifiOff, X } from 'lucide-react';
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
  const [guideMode, setGuideMode] = useState<'ios' | 'browser' | null>(null);

  if (isInstalled) return null;
  if (!isInstallable && !isIOS && !showFallback) return null;

  const handleClick = async () => {
    if (isInstallable) {
      const outcome = await install();
      if (outcome !== 'unavailable') return;
    }
    if (isIOS) {
      setGuideMode('ios');
    } else {
      setGuideMode('browser');
    }
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

      {guideMode &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="dm-pwa-modal-backdrop"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dm-pwa-guide-title"
            onClick={() => setGuideMode(null)}
          >
            <div className="dm-pwa-modal" onClick={(e) => e.stopPropagation()}>
              <div className="dm-pwa-modal-head">
                <div className="dm-pwa-modal-title">
                  <span className="dm-pwa-modal-icon">
                    <Smartphone size={18} />
                  </span>
                  <div>
                    <h3 id="dm-pwa-guide-title">Install {appName}</h3>
                    <p>Add to your home screen or desktop for instant access</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="dm-pwa-modal-close"
                  onClick={() => setGuideMode(null)}
                  aria-label="Close install instructions"
                >
                  <X size={16} />
                </button>
              </div>

              {guideMode === 'ios' ? (
                <ol className="dm-pwa-steps">
                  <li>
                    <span className="dm-pwa-step-num">1</span>
                    <span>
                      Tap the <Share size={14} style={{ display: 'inline', verticalAlign: '-2px' }} />{' '}
                      <strong>Share</strong> button in your Safari toolbar.
                    </span>
                  </li>
                  <li>
                    <span className="dm-pwa-step-num">2</span>
                    <span>
                      Scroll down and tap{' '}
                      <PlusSquare size={14} style={{ display: 'inline', verticalAlign: '-2px' }} />{' '}
                      <strong>Add to Home Screen</strong>.
                    </span>
                  </li>
                  <li>
                    <span className="dm-pwa-step-num">3</span>
                    <span>
                      Tap <strong>Add</strong> in the top-right corner to install the app icon.
                    </span>
                  </li>
                </ol>
              ) : (
                <ol className="dm-pwa-steps">
                  <li>
                    <span className="dm-pwa-step-num">1</span>
                    <span>
                      Open this page directly in <strong>Chrome</strong>, <strong>Edge</strong>, or{' '}
                      <strong>Samsung Internet</strong> (outside an in-app browser).
                    </span>
                  </li>
                  <li>
                    <span className="dm-pwa-step-num">2</span>
                    <span>
                      Click the install icon in the address bar, or open the{' '}
                      <MoreVertical size={14} style={{ display: 'inline', verticalAlign: '-2px' }} />{' '}
                      browser menu.
                    </span>
                  </li>
                  <li>
                    <span className="dm-pwa-step-num">3</span>
                    <span>
                      Select <strong>Install app</strong> or <strong>Add to Home screen</strong> to
                      create a standalone shortcut.
                    </span>
                  </li>
                </ol>
              )}

              <button
                type="button"
                className="dm-pwa-modal-done"
                onClick={() => setGuideMode(null)}
              >
                Got it
              </button>
            </div>
          </div>,
          document.body
        )}
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
