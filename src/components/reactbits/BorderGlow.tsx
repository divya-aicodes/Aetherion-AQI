import { useCallback, useEffect, useRef, type CSSProperties, type ReactNode } from 'react';

type GlowStyle = CSSProperties & Record<`--${string}`, string | number>;
function parseHsl(value: string) { const match = value.match(/([\d.]+)\s*([\d.]+)%?\s*([\d.]+)%?/); return match ? { h: +match[1], s: +match[2], l: +match[3] } : { h: 215, s: 90, l: 70 }; }

export default function BorderGlow({ children, className = '', edgeSensitivity = 30, glowColor = '215 90 70', backgroundColor = '#11151c', borderRadius = 14, glowRadius = 28, animated = false, colors = ['#2563eb', '#38bdf8', '#34d399'] }: { children: ReactNode; className?: string; edgeSensitivity?: number; glowColor?: string; backgroundColor?: string; borderRadius?: number; glowRadius?: number; animated?: boolean; colors?: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const update = useCallback((x: number, y: number) => {
    const card = ref.current; if (!card) return; const rect = card.getBoundingClientRect(); const cx = rect.width / 2; const cy = rect.height / 2; const dx = x - rect.left - cx; const dy = y - rect.top - cy;
    const kx = dx ? cx / Math.abs(dx) : Infinity; const ky = dy ? cy / Math.abs(dy) : Infinity; const edge = Math.min(Math.max(1 / Math.min(kx, ky), 0), 1); let angle = Math.atan2(dy, dx) * 180 / Math.PI + 90; if (angle < 0) angle += 360;
    card.style.setProperty('--edge-proximity', `${edge * 100}`); card.style.setProperty('--cursor-angle', `${angle}deg`);
  }, []);
  useEffect(() => { if (!animated || !ref.current || matchMedia('(prefers-reduced-motion: reduce)').matches) return; const card = ref.current; card.classList.add('sweep-active'); card.style.setProperty('--edge-proximity', '100'); const timer = window.setTimeout(() => { card.classList.remove('sweep-active'); card.style.setProperty('--edge-proximity', '0'); }, 1800); return () => window.clearTimeout(timer); }, [animated]);
  const { h, s, l } = parseHsl(glowColor);
  const style: GlowStyle = { '--card-bg': backgroundColor, '--edge-sensitivity': edgeSensitivity, '--border-radius': `${borderRadius}px`, '--glow-padding': `${glowRadius}px`, '--glow-color': `hsl(${h}deg ${s}% ${l}% / 90%)`, '--glow-color-soft': `hsl(${h}deg ${s}% ${l}% / 28%)`, '--gradient-one': colors[0], '--gradient-two': colors[1] || colors[0], '--gradient-three': colors[2] || colors[0] };
  return <div ref={ref} onPointerMove={event => update(event.clientX, event.clientY)} className={`border-glow-card ${className}`} style={style}><span className="edge-light"/><div className="border-glow-inner">{children}</div></div>;
}
