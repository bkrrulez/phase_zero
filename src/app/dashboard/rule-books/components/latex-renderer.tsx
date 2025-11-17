
'use client';

import React from 'react';
import Latex from 'react-latex-next';

interface LatexRendererProps {
  text: string;
}

export function LatexRenderer({ text }: LatexRendererProps) {
  const parts = text.split(/(\$.*?\$)/);

  return (
    <div className="whitespace-normal">
      {parts.map((part, index) => {
        if (part.startsWith('$') && part.endsWith('$')) {
          // It's a LaTeX part, wrap it in Latex component
          return <Latex key={index}>{part}</Latex>;
        }
        // It's a normal text part
        return <span key={index}>{part}</span>;
      })}
    </div>
  );
}
