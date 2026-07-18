import { motion, useAnimationFrame, useMotionValue, useReducedMotion, useTransform } from 'motion/react';
import { useRef } from 'react';

export default function ShinyText({ text, speed = 2.8, delay = 1.5, className = '', color = '#7e8ba0', shineColor = '#dbeafe' }: { text: string; speed?: number; delay?: number; className?: string; color?: string; shineColor?: string }) {
  const progress = useMotionValue(0);
  const elapsed = useRef(0);
  const previous = useRef<number | null>(null);
  const reduceMotion = useReducedMotion();
  useAnimationFrame(time => {
    if (reduceMotion) return;
    if (previous.current === null) { previous.current = time; return; }
    elapsed.current += time - previous.current; previous.current = time;
    const animation = speed * 1000; const cycle = animation + delay * 1000; const t = elapsed.current % cycle;
    progress.set(t < animation ? t / animation * 100 : 100);
  });
  const backgroundPosition = useTransform(progress, value => `${150 - value * 2}% center`);
  return <motion.span className={`shiny-text ${className}`} style={reduceMotion ? { color } : { backgroundImage: `linear-gradient(120deg,${color} 0%,${color} 35%,${shineColor} 50%,${color} 65%,${color} 100%)`, backgroundSize: '200% auto', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundPosition }}>{text}</motion.span>;
}
