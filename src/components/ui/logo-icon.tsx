
export const LogoIcon = ({ className }: { className?: string }) => (
    <svg
        viewBox="0 0 150 42"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
    >
        <title>Phase0 Logo</title>
        <text x="0" y="28" style={{ fontFamily: 'Inter, sans-serif', fontSize: '24px', fontWeight: 'bold', fill: 'hsl(var(--primary))' }}>
            Phase
        </text>
        <g transform="translate(100 21)">
            <circle cx="0" cy="0" r="12" stroke="hsl(var(--primary))" strokeWidth="2" />
            <circle cx="0" cy="0" r="8" stroke="hsl(var(--accent))" strokeWidth="2" />
            <circle cx="0" cy="0" r="4" fill="hsl(var(--primary))" />
            <path d="M0 -12 V -6 M0 6 V 12 M-12 0 H -6 M6 0 H 12" stroke="hsl(var(--primary))" strokeWidth="1.5" />
        </g>
        <rect x="0" y="35" width="80" height="2" fill="hsl(var(--accent))" />
    </svg>
);
