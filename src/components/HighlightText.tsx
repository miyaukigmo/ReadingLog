import React, { Fragment } from 'react';

interface HighlightTextProps {
  text: string;
  query: string;
}

export const HighlightText: React.FC<HighlightTextProps> = ({ text, query }) => {
  if (!text) return null;
  
  if (!query) {
    return (
      <>
        {text.split('\n').map((line, i, arr) => (
          <Fragment key={i}>
            {line}
            {i < arr.length - 1 && <br />}
          </Fragment>
        ))}
      </>
    );
  }
  
  const regex = new RegExp(`(${query})`, 'gi');
  const parts = text.split(regex);
  
  return (
    <>
      {parts.map((part, i) => {
        if (regex.test(part)) {
          return (
            <mark key={i} className="bg-yellow-200 text-gray-900 rounded-sm px-0.5">
              {part}
            </mark>
          );
        }
        
        return (
          <Fragment key={i}>
            {part.split('\n').map((line, j, arr) => (
              <Fragment key={`${i}-${j}`}>
                {line}
                {j < arr.length - 1 && <br />}
              </Fragment>
            ))}
          </Fragment>
        );
      })}
    </>
  );
};
