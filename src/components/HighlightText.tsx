import React from 'react';

interface HighlightTextProps {
  text: string;
  query: string;
}

export const HighlightText: React.FC<HighlightTextProps> = ({ text, query }) => {
  if (!query || !text) return <>{text}</>;
  
  const regex = new RegExp(`(${query})`, 'gi');
  const parts = text.split(regex);
  
  return (
    <>
      {parts.map((part, i) => 
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-200 text-gray-900 rounded-sm px-0.5">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
};
