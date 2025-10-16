
export const LogoIcon = ({ className }: { className?: string }) => (
    <svg
        viewBox="0 0 42 42"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
    >
        <title>Phase0 Compass Logo</title>
        <circle cx="21" cy="21" r="18" stroke="hsl(var(--primary))" strokeWidth="4"/>
        <path d="M21 12 L27 21 L21 30 L15 21 L21 12Z" fill="hsl(var(--accent))" />
        <path d="M21 12 L15 21 L21 30 L27 21 L21 12Z" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinejoin="round"/>
        <circle cx="21" cy="21" r="2" fill="hsl(var(--primary))"/>
    </svg>
);
