import { useInView, useMotionValue, useReducedMotion, useSpring } from 'motion/react';
import { useCallback, useEffect, useRef } from 'react';

export default function CountUp({ to, from = 0, duration = .8, className = '', separator = '' }: { to: number; from?: number; duration?: number; className?: string; separator?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(from);
  const springValue = useSpring(motionValue, { damping: 20 + 40 / duration, stiffness: 100 / duration });
  const isInView = useInView(ref, { once: true, margin: '0px' });
  const reduceMotion = useReducedMotion();
  const decimals = Math.max((from.toString().split('.')[1] || '').length, (to.toString().split('.')[1] || '').length);
  const format = useCallback((value: number) => {
    const result = Intl.NumberFormat('en-US', { useGrouping: Boolean(separator), minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
    return separator ? result.replace(/,/g, separator) : result;
  }, [decimals, separator]);
  useEffect(() => { if (ref.current) ref.current.textContent = format(reduceMotion ? to : from); }, [format, from, reduceMotion, to]);
  useEffect(() => { if (isInView && !reduceMotion) motionValue.set(to); }, [isInView, motionValue, reduceMotion, to]);
  useEffect(() => springValue.on('change', latest => { if (ref.current) ref.current.textContent = format(latest); }), [format, springValue]);
  return <span ref={ref} className={className}/>;
}
