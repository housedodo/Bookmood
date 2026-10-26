import type { CSSProperties } from 'react';
import '../styles/confetti.css';

// 12 hearts with fixed spreads, so the burst looks the same every time (CSS does the motion).
const HEARTS = Array.from({ length: 12 }, (_, i) => ({
  x: Math.round(Math.sin(i * 2.4) * 140),
  delay: (i % 4) * 0.06,
  size: 14 + (i % 3) * 6,
  color: ['var(--pink-400)', 'var(--pink-300)', 'var(--lavender)', 'var(--pink-500)'][i % 4],
}));

/** Tiny burst of hearts. Re-mount (change its key) to play it again. */
export default function HeartConfetti() {
  return (
    <div className="confetti" aria-hidden="true">
      {HEARTS.map((heart, i) => (
        <span
          key={i}
          style={{ '--x': `${heart.x}px`, '--delay': `${heart.delay}s`, '--size': `${heart.size}px`, color: heart.color } as CSSProperties}
        >
          ♥
        </span>
      ))}
    </div>
  );
}
