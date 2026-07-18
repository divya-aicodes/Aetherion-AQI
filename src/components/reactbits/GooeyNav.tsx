import { useEffect, useRef, type ReactNode } from 'react';

export interface GooeyNavItem { label: string; icon?: ReactNode }

export default function GooeyNav({ items, activeIndex, onSelect, particleCount = 7, animationTime = 450 }: { items: GooeyNavItem[]; activeIndex: number; onSelect: (index: number) => void; particleCount?: number; animationTime?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLUListElement>(null);
  const filterRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const reduceMotion = typeof window !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  const positionEffect = (element: HTMLElement) => {
    if (!containerRef.current || !filterRef.current || !textRef.current) return;
    const container = containerRef.current.getBoundingClientRect(); const rect = element.getBoundingClientRect();
    const styles = { left: `${rect.x - container.x}px`, top: `${rect.y - container.y}px`, width: `${rect.width}px`, height: `${rect.height}px` };
    Object.assign(filterRef.current.style, styles); Object.assign(textRef.current.style, styles); textRef.current.textContent = element.textContent;
  };

  const particles = () => {
    const host = filterRef.current; if (!host || reduceMotion) return;
    host.querySelectorAll('.gooey-particle').forEach(node => node.remove());
    for (let index = 0; index < particleCount; index++) {
      const angle = (Math.PI * 2 * index) / particleCount; const distance = 16 + Math.random() * 18;
      const particle = document.createElement('span'); particle.className = 'gooey-particle';
      particle.style.setProperty('--start-x', `${Math.cos(angle) * distance}px`); particle.style.setProperty('--start-y', `${Math.sin(angle) * distance}px`);
      particle.style.setProperty('--color', `var(--color-${index % 4 + 1})`); particle.style.setProperty('--time', `${animationTime + Math.random() * 220}ms`);
      const point = document.createElement('span'); point.className = 'gooey-point'; particle.appendChild(point); host.appendChild(particle);
      window.setTimeout(() => particle.remove(), animationTime + 300);
    }
  };

  useEffect(() => {
    const item = navRef.current?.querySelectorAll('li')[activeIndex] as HTMLElement | undefined;
    if (item) positionEffect(item);
    const observer = new ResizeObserver(() => { const current = navRef.current?.querySelectorAll('li')[activeIndex] as HTMLElement | undefined; if (current) positionEffect(current); });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [activeIndex]);

  return <div className="gooey-nav-container" ref={containerRef}><nav aria-label="Primary navigation"><ul ref={navRef}>{items.map((item, index) => <li key={item.label} className={activeIndex === index ? 'active' : ''}><button type="button" aria-current={activeIndex === index ? 'page' : undefined} onClick={event => { if (index !== activeIndex) { positionEffect(event.currentTarget.parentElement!); particles(); onSelect(index); } }}><span className="gooey-icon">{item.icon}</span><span className="gooey-label">{item.label}</span></button></li>)}</ul></nav><span className="gooey-effect gooey-filter" ref={filterRef}/><span className="gooey-effect gooey-text" ref={textRef}/></div>;
}
