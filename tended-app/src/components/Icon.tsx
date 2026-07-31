/**
 * Line icons, drawn rather than installed.
 *
 * `react-native-svg` is already a dependency, and the set needed here is small
 * enough that a path each is cheaper than an icon package — no font to load, no
 * licence to track, and every glyph is the same stroke weight because they are
 * all drawn on the same 24-unit grid.
 *
 * Outline only, and never filled except where fill carries meaning: a heart
 * fills when you have sent one, and nothing else changes shape on press.
 */

import React from 'react';
import Svg, { Circle, Path, Polyline } from 'react-native-svg';
import { color } from '../theme';

export type IconName =
  | 'home'
  | 'message'
  | 'plus'
  | 'person'
  | 'gear'
  | 'heart'
  | 'hug'
  | 'hand'
  | 'bookmark'
  | 'flag'
  | 'back'
  | 'send';

export function Icon({
  name,
  size = 24,
  tone = color.ink,
  filled = false,
  strokeWidth = 1.7,
}: {
  name: IconName;
  size?: number;
  tone?: string;
  filled?: boolean;
  strokeWidth?: number;
}) {
  const stroke = tone;
  const fill = filled ? tone : 'none';
  const common = {
    stroke,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'home' && (
        <Path
          d="M3.5 10.5 12 3.8l8.5 6.7V20a.8.8 0 0 1-.8.8h-5V14h-5.4v6.8h-5a.8.8 0 0 1-.8-.8Z"
          {...common}
          fill={filled ? tone : 'none'}
        />
      )}

      {/* The paper plane Threads uses for messages: one outline, one crease. */}
      {name === 'message' && (
        <>
          <Path d="M21.2 3.4 2.9 10.2a.55.55 0 0 0 .05 1.04l7.3 2.3 2.3 7.3a.55.55 0 0 0 1.04.05Z" {...common} />
          <Path d="M10.25 13.54 21.2 3.4" {...common} />
        </>
      )}

      {name === 'send' && (
        <>
          <Path d="M21.2 3.4 2.9 10.2a.55.55 0 0 0 .05 1.04l7.3 2.3 2.3 7.3a.55.55 0 0 0 1.04.05Z" {...common} fill={tone} stroke={tone} />
        </>
      )}

      {name === 'plus' && (
        <>
          <Path d="M12 5.5v13" {...common} strokeWidth={strokeWidth + 0.3} />
          <Path d="M5.5 12h13" {...common} strokeWidth={strokeWidth + 0.3} />
        </>
      )}

      {name === 'person' && (
        <>
          <Circle cx={12} cy={8.2} r={3.9} {...common} />
          <Path d="M4.4 20.4c1.3-3.6 4.2-5.6 7.6-5.6s6.3 2 7.6 5.6" {...common} />
        </>
      )}

      {/* Sliders rather than a cog. A cog needs eight teeth and a hub inside a
          24px box, and at nav size the teeth close up into a blob; two tracks
          with a knob each stays legible and reads as settings just as well. */}
      {name === 'gear' && (
        <>
          <Path d="M4 8.5h16M4 15.5h16" {...common} />
          <Circle cx={9.5} cy={8.5} r={2.4} {...common} fill={color.ground} />
          <Circle cx={15} cy={15.5} r={2.4} {...common} fill={color.ground} />
        </>
      )}

      {name === 'heart' && (
        <Path
          d="M12 20.3s-7.7-4.6-7.7-9.6a4.3 4.3 0 0 1 7.7-2.6 4.3 4.3 0 0 1 7.7 2.6c0 5-7.7 9.6-7.7 9.6Z"
          {...common}
          fill={fill}
        />
      )}

      {/* Reaction glyphs. Two arms around a shape for "needed this", a raised
          hand for "doing this too" — both readable at 20px, which the emoji
          they replace were not. */}
      {name === 'hug' && (
        <>
          <Circle cx={12} cy={9.4} r={3.4} {...common} fill={fill} />
          <Path d="M4.8 20.2c0-2.6 1.6-4.6 3.6-4.6M19.2 20.2c0-2.6-1.6-4.6-3.6-4.6" {...common} />
          <Path d="M8.4 15.6h7.2" {...common} />
        </>
      )}

      {name === 'hand' && (
        <Path
          d="M9 12.6V6.4a1.5 1.5 0 0 1 3 0v5m0-1.2a1.5 1.5 0 0 1 3 0v1.6m0-.8a1.5 1.5 0 0 1 3 0v3.4c0 3.1-2.4 5.6-5.4 5.6-3 0-5.4-2.5-5.4-5.6v-2.9a1.5 1.5 0 0 1 3 0"
          {...common}
          fill={fill}
        />
      )}

      {name === 'bookmark' && (
        <Path d="M6.4 3.9h11.2v16.6L12 16.2l-5.6 4.3Z" {...common} fill={fill} />
      )}

      {name === 'flag' && (
        <>
          <Path d="M6.2 3.4v17.2" {...common} />
          <Path d="M6.2 4.4h11.6l-2.2 4 2.2 4H6.2Z" {...common} fill={fill} />
        </>
      )}

      {name === 'back' && <Polyline points="14.5,5 7.5,12 14.5,19" {...common} />}
    </Svg>
  );
}
