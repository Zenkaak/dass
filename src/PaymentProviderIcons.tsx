export function MpesaProviderIcon({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`sf-provider-mark sf-provider-mpesa ${compact ? 'is-compact' : ''}`} aria-hidden="true">
      <svg viewBox="0 0 64 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="0.5" y="0.5" width="63" height="35" rx="7.5" fill="#F0FDF4" stroke="#BBF7D0" />
        {/* Stylized mobile handset & M-PESA green/red mark */}
        <rect x="8" y="8.5" width="11" height="19" rx="2.2" fill="#15803D" />
        <rect x="10" y="11" width="7" height="10.5" rx="1" fill="#DCFCE7" />
        <path d="M12 24.5H15" stroke="#DCFCE7" strokeWidth="1.5" strokeLinecap="round" />
        <path
          d="M15.5 14.5L22 10.5V18.5L15.5 14.5Z"
          fill="#DC2626"
        />
        <text
          x="24.5"
          y="21.5"
          fill="#15803D"
          fontFamily="'Plus Jakarta Sans', system-ui, sans-serif"
          fontWeight="800"
          fontSize="10.5"
          letterSpacing="-0.04em"
        >
          M
        </text>
        <rect x="34.2" y="17.1" width="3.2" height="1.8" rx="0.9" fill="#DC2626" />
        <text
          x="38.2"
          y="21.5"
          fill="#14532D"
          fontFamily="'Plus Jakarta Sans', system-ui, sans-serif"
          fontWeight="800"
          fontSize="8.8"
          letterSpacing="-0.03em"
        >
          PESA
        </text>
      </svg>
    </span>
  );
}

export function CardProviderIcon({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`sf-provider-mark sf-provider-card ${compact ? 'is-compact' : ''}`} aria-hidden="true">
      <svg viewBox="0 0 64 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="0.5" y="0.5" width="63" height="35" rx="7.5" fill="#0F172A" stroke="#1E293B" />
        <rect x="7" y="12" width="11" height="8" rx="1.6" fill="#FBBF24" />
        <path d="M10.5 12V20M14.5 12V20M7 16H18" stroke="#92400E" strokeWidth="0.9" />
        <circle cx="47.5" cy="23.5" r="4.5" fill="#EB001B" />
        <circle cx="52.5" cy="23.5" r="4.5" fill="#F79E1B" fillOpacity="0.92" />
        <text
          x="7"
          y="27"
          fill="#E2E8F0"
          fontFamily="'JetBrains Mono', monospace"
          fontWeight="700"
          fontSize="6.4"
          letterSpacing="0.06em"
        >
          •••• 4242
        </text>
        <path
          d="M50.5 9.5C52 11 52 13.5 50.5 15M53 8C55.2 10.3 55.2 14.2 53 16.5"
          stroke="#94A3B8"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

export function CardNetworkLogos() {
  return (
    <span className="sf-network-logos" aria-label="Visa and Mastercard supported">
      <svg viewBox="0 0 42 22" width="38" height="20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="0.5" y="0.5" width="41" height="21" rx="4" fill="#FFFFFF" stroke="#E2E8F0" />
        <text
          x="21"
          y="14.5"
          textAnchor="middle"
          fill="#1A1F71"
          fontFamily="'Plus Jakarta Sans', system-ui, sans-serif"
          fontWeight="800"
          fontStyle="italic"
          fontSize="10"
          letterSpacing="0.02em"
        >
          VISA
        </text>
      </svg>
      <svg viewBox="0 0 42 22" width="38" height="20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="0.5" y="0.5" width="41" height="21" rx="4" fill="#FFFFFF" stroke="#E2E8F0" />
        <circle cx="17" cy="11" r="5.5" fill="#EB001B" />
        <circle cx="25" cy="11" r="5.5" fill="#F79E1B" fillOpacity="0.92" />
      </svg>
    </span>
  );
}

export function CashProviderIcon({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`sf-provider-mark sf-provider-cash ${compact ? 'is-compact' : ''}`} aria-hidden="true">
      <svg viewBox="0 0 64 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="0.5" y="0.5" width="63" height="35" rx="7.5" fill="#FFFBEB" stroke="#FDE68A" />
        <rect x="10" y="9" width="44" height="18" rx="3" fill="#FEF3C7" stroke="#D97706" strokeWidth="1.2" />
        <circle cx="32" cy="18" r="4.5" stroke="#B45309" strokeWidth="1.2" />
        <text
          x="32"
          y="20.4"
          textAnchor="middle"
          fill="#92400E"
          fontFamily="'Plus Jakarta Sans', system-ui, sans-serif"
          fontWeight="800"
          fontSize="6.6"
        >
          KSh
        </text>
        <path d="M14.5 13H17.5M46.5 23H49.5" stroke="#D97706" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    </span>
  );
}
