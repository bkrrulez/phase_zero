
export const LogoIcon = ({ className }: { className?: string }) => (
    <svg
        viewBox="0 0 42 42"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
    >
        <title>Phase0 Compass Logo</title>
        <circle cx="21" cy="21" r="18" stroke="hsl(var(--primary))" strokeWidth="2"/>
        <circle cx="21" cy="21" r="14" stroke="hsl(var(--primary))" strokeWidth="1" strokeDasharray="3 3"/>
        
        {/* Star */}
        <path d="M21 9 L23 19 L21 23 L19 19 L21 9Z" fill="hsl(var(--accent))" />
        <path d="M33 21 L23 23 L19 21 L23 19 L33 21Z" fill="hsl(var(--accent))" />
        <path d="M21 33 L19 23 L21 19 L23 23 L21 33Z" fill="hsl(var(--accent))" />
        <path d="M9 21 L19 23 L23 21 L19 19 L9 21Z" fill="hsl(var(--accent))" />

        <path d="M21 9 L23 19 L21 23 L19 19 L21 9Z" stroke="hsl(var(--primary))" strokeWidth="1" strokeLinejoin="round" />
        <path d="M33 21 L23 23 L19 21 L23 19 L33 21Z" stroke="hsl(var(--primary))" strokeWidth="1" strokeLinejoin="round" />
        <path d="M21 33 L19 23 L21 19 L23 23 L21 33Z" stroke="hsl(var(--primary))" strokeWidth="1" strokeLinejoin="round" />
        <path d="M9 21 L19 23 L23 21 L19 19 L9 21Z" stroke="hsl(var(--primary))" strokeWidth="1" strokeLinejoin="round" />
    </svg>
);
