export const FolderIcon = ({ className }: { className?: string }) => (
    <svg
        viewBox="0 0 100 75"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
    >
        {/* This creates the darker top part of the folder */}
        <path 
            d="M10 8 H35 L45 18 H90 V25 H10Z"
            className="fill-primary"
        />
        {/* This creates the lighter main body of the folder */}
        <path 
            d="M10 22 H90 V67 C90 68.1046 89.1046 69 88 69 H12 C10.8954 69 10 68.1046 10 67V22Z"
            fill="hsl(var(--accent) / 0.8)"
        />
    </svg>
);
