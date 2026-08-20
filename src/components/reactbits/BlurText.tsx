import { motion, useReducedMotion } from 'motion/react';
import { createElement, useEffect, useMemo, useRef, useState, type ElementType } from 'react';

interface Snapshot {
  filter: string;
  opacity: number;
  y: number;
}

function buildKeyframes(from: Snapshot, steps: Snapshot[]) {
  return {
    filter: [from.filter, ...steps.map(step => step.filter)],
    opacity: [from.opacity, ...steps.map(step => step.opacity)],
    y: [from.y, ...steps.map(step => step.y)],
  };
}

export default function BlurText({ text = '', delay = 70, className = '', animateBy = 'words', direction = 'top', threshold = .1, rootMargin = '0px', stepDuration = .28, as = 'p' }: {
  text?: string; delay?: number; className?: string; animateBy?: 'words' | 'letters'; direction?: 'top' | 'bottom'; threshold?: number; rootMargin?: string; stepDuration?: number; as?: ElementType;
}) {
  const elements = animateBy === 'words' ? text.split(' ') : text.split('');
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLElement | null>(null);
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    if (!ref.current || reduceMotion) { setInView(true); return; }
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setInView(true); observer.disconnect(); } }, { threshold, rootMargin });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [reduceMotion, rootMargin, threshold]);
  const from = useMemo(() => ({ filter: 'blur(9px)', opacity: 0, y: direction === 'top' ? -22 : 22 }), [direction]);
  const to = useMemo(() => [{ filter: 'blur(4px)', opacity: .6, y: direction === 'top' ? 3 : -3 }, { filter: 'blur(0px)', opacity: 1, y: 0 }], [direction]);
  const Tag = as;
  return createElement(Tag, { ref, className, style: { display: 'flex', flexWrap: 'wrap' } }, elements.map((segment, index) => <motion.span className="blur-text-segment" key={`${segment}-${index}`} initial={reduceMotion ? false : from} animate={inView ? buildKeyframes(from, to) : from} transition={{ duration: stepDuration * 2, times: [0, .5, 1], delay: reduceMotion ? 0 : index * delay / 1000 }}>{segment}{animateBy === 'words' && index < elements.length - 1 ? '\u00A0' : ''}</motion.span>));
}
