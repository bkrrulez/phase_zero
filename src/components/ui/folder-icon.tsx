
import { type Project } from '@/lib/types';

export const FolderIcon = ({ className, project }: { className?: string, project: Project }) => {
    const maxAddressLength = 22;
    const truncatedAddress = project.address.length > 25 
        ? `${project.address.substring(0, maxAddressLength)}...`
        : project.address;

    const maxLineLength = 15;
    let line1 = project.name;
    let line2 = '';

    if (project.name.length > maxLineLength) {
        const words = project.name.split(' ');
        let currentLine = '';
        const lines = [];

        for (const word of words) {
            if ((currentLine + word).length > maxLineLength) {
                lines.push(currentLine.trim());
                currentLine = word + ' ';
            } else {
                currentLine += word + ' ';
            }
        }
        lines.push(currentLine.trim());

        line1 = lines[0] || '';
        if (lines.length > 1) {
            line2 = lines.slice(1).join(' ');
            if (line2.length > maxLineLength) {
                line2 = `${line2.substring(0, maxLineLength - 3)}...`;
            }
        }
    }

    return (
        <svg
            viewBox="0 0 100 60"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            <title>{project.name}</title>
            
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
                y="12.5"
                className="text-[6px] font-bold fill-primary-foreground/80"
                textAnchor="start"
            >
                <title>Project Number: {project.projectNumber}</title>
                {project.projectNumber}
            </text>
            
            <text
                x="50"
                y={line2 ? "30" : "36"} // Adjust y position if there's a second line
                textAnchor="middle"
                alignmentBaseline="middle"
                className="text-[10px] font-bold fill-primary-foreground"
            >
                <title>{project.name}</title>
                {line1}
            </text>
            {line2 && (
                <text
                    x="50"
                    y="42"
                    textAnchor="middle"
                    alignmentBaseline="middle"
                    className="text-[10px] font-bold fill-primary-foreground"
                >
                    {line2}
                </text>
            )}

            <text
                x="8"
                y="54"
                className="text-[7px] fill-primary-foreground/90"
                textAnchor="start"
            >
                <title>{project.address}</title>
                {truncatedAddress}
            </text>
        </svg>
    );
};
