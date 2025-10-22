
import { type Project } from '@/lib/types';

export const FolderIcon = ({ className, project }: { className?: string, project: Project }) => {
    const maxAddressLength = 28;
    const truncatedAddress = project.address.length > maxAddressLength 
        ? `${project.address.substring(0, maxAddressLength)}...`
        : project.address;

    return (
        <svg
            viewBox="0 0 100 60"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            <path 
                d="M5 6 H30 L38 12 H95 V16 H5Z"
                className="fill-primary"
            />
            <path 
                d="M5 15 H95 V55 C95 56.1046 94.1046 57 93 57 H7 C5.89543 57 5 56.1046 5 55V15Z"
                fill="hsl(var(--accent) / 0.8)"
            />
            <text
                x="8"
                y="11"
                className="text-[3px] fill-primary-foreground/80 font-mono"
                textAnchor="start"
            >
                #{project.projectNumber}
            </text>
            <text
                x="50"
                y="36"
                textAnchor="middle"
                alignmentBaseline="middle"
                className="text-[8px] font-bold fill-primary-foreground"
            >
                {project.name}
            </text>
            <text
                x="8"
                y="54"
                className="text-[6.5px] fill-primary-foreground/90"
                textAnchor="start"
            >
                <title>{project.address}</title>
                {truncatedAddress}
            </text>
        </svg>
    );
};
