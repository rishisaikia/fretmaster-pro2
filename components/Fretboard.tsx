import React from 'react';
import { ChordPosition } from '../types';

interface FretboardProps {
  position: ChordPosition;
  className?: string;
}

const Fretboard: React.FC<FretboardProps> = ({ position, className = "" }) => {
  const { frets, barres, baseFret } = position;
  const numStrings = 6;
  const numFrets = 5;
  const width = 100;
  const height = 120;
  const paddingX = 15;
  const paddingY = 20;

  // String gap
  const sGap = (width - 2 * paddingX) / (numStrings - 1);
  // Fret gap
  const fGap = (height - 2 * paddingY) / numFrets;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={`w-full h-full ${className}`}>
      {/* Nut or Base Fret Indicator */}
      {baseFret === 1 ? (
        <rect x={paddingX - 1} y={paddingY - 4} width={width - 2 * paddingX + 2} height={4} fill="#e5e7eb" rx={1} />
      ) : (
        <text
          x={paddingX - 4}
          y={paddingY + 8}
          textAnchor="end"
          fill="currentColor"
          fontSize="9"
          fontWeight="bold"
          className="text-gray-400 font-bold"
        >
          {baseFret}fr
        </text>
      )}

      {/* Frets */}
      {Array.from({ length: numFrets + 1 }).map((_, i) => (
        <line
          key={`fret-${i}`}
          x1={paddingX}
          y1={paddingY + i * fGap}
          x2={width - paddingX}
          y2={paddingY + i * fGap}
          stroke="#4b5563"
          strokeWidth="1"
        />
      ))}

      {/* Strings */}
      {Array.from({ length: numStrings }).map((_, i) => (
        <line
          key={`string-${i}`}
          x1={paddingX + i * sGap}
          y1={paddingY}
          x2={paddingX + i * sGap}
          y2={height - paddingY}
          stroke="#9ca3af"
          strokeWidth={i > 2 ? 1.5 : 0.8}
        />
      ))}

      {/* Barres */}
      {barres?.map((fret) => {
        // Calculate relative fret position
        const relFret = fret - (baseFret - 1);
        const fretY = paddingY + (relFret - 0.5) * fGap;
        return (
          <rect
            key={`barre-${fret}`}
            x={paddingX - 2}
            y={fretY - 4}
            width={width - 2 * paddingX + 4}
            height={8}
            fill="#308ce8"
            rx={4}
          />
        );
      })}

      {/* Fingers / Notes */}
      {frets.map((fret, stringIdx) => {
        // Skip muted or open if strictly drawing dots, but handle markers
        if (fret === -1) {
          // X Marker
          return (
            <text
              key={`mute-${stringIdx}`}
              x={paddingX + stringIdx * sGap}
              y={paddingY - 8}
              textAnchor="middle"
              fill="#ef4444"
              fontSize="10"
            >×</text>
          );
        }
        if (fret === 0) {
          // Open string circle
          return (
            <circle
              key={`open-${stringIdx}`}
              cx={paddingX + stringIdx * sGap}
              cy={paddingY - 11}
              r="2.5"
              stroke="#9ca3af"
              strokeWidth="1"
              fill="none"
            // If baseFret > 1, open strings are technically "behind" the view, 
            // but standard notation shows them at the top.
            />
          );
        }

        // Calculate relative fret position for dot
        const relFret = fret - (baseFret - 1);

        // Check if covered by barre
        const isBarred = barres?.includes(fret);

        // Draw Dot
        return (
          <g key={`dot-${stringIdx}`}>
            <circle
              cx={paddingX + stringIdx * sGap}
              cy={paddingY + (relFret - 0.5) * fGap}
              r={6}
              fill="#308ce8"
              stroke="#1c2630"
              strokeWidth={1}
            />
            {position.fingers[stringIdx] > 0 && (
              <text
                x={paddingX + stringIdx * sGap}
                cy={paddingY + (relFret - 0.5) * fGap + 2.5}
                textAnchor="middle"
                fill="white"
                fontSize="7"
                fontWeight="bold"
              >
                {position.fingers[stringIdx]}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
};

export default Fretboard;