import { motion } from 'motion/react';
import { useEffect, type CSSProperties } from 'react';
import { ArrowRight, Bot, CloudSun, Database, Key, Map, ShieldCheck, Wind } from 'lucide-react';
import type { User } from 'firebase/auth';
import CountUp from './components/reactbits/CountUp';
import Lightfall from './components/reactbits/Lightfall';
import type { AQIData } from './types';

const INTRO_LIGHT_COLORS = ['#60a5fa', '#2563eb', '#34d399'];

export default function IntroPage({ onClose, user, isAuthenticating, handleLogin, loginError, readings }: {
  onClose: () => void;
  user: User | null;
  isAuthenticating: boolean;
  handleLogin: () => void;
  loginError?: string | null;
  readings: AQIData[];
}) {
  const priorityReading = readings.reduce<AQIData | undefined>((highest, reading) => !highest || reading.value > highest.value ? reading : highest, undefined);
  const elevatedLocations = readings.filter(reading => reading.value > 100).length;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);

  return (
    <motion.div className="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <Lightfall
        className="intro-lightfall"
        colors={INTRO_LIGHT_COLORS}
        backgroundColor="#07111f"
        speed={0.28}
        streakWidth={0.7}
        streakLength={1.4}
        glow={0.65}
        density={0.4}
        twinkle={0.25}
        zoom={3.4}
        backgroundGlow={0.3}
        opacity={0.28}
        mouseStrength={0.25}
        mouseRadius={0.9}
      />
      <header>
        <div className="brand"><span className="brand-mark"><Wind size={21}/></span><span><strong>AETHERION</strong><small>Air quality, clearly explained</small></span></div>
        <button className="intro-skip" onClick={onClose}>Explore dashboard <ArrowRight size={15}/></button>
      </header>
      <main>
        <section className="intro-hero">
          <div>
            <span className="intro-kicker"><span/>Current modeled air-quality data</span>
            <h1>Know the air.<br/><em>Plan with confidence.</em></h1>
            <p>Track US AQI and PM2.5 across Indian and global cities, understand health guidance, and compare conditions without the noise.</p>
            <div className="intro-actions">
              <button className="primary-button" onClick={onClose}>Open live dashboard <ArrowRight size={16}/></button>
              {!user && <button className="secondary-button" onClick={handleLogin} disabled={isAuthenticating}><Key size={15}/>{isAuthenticating ? 'Signing in...' : 'Sign in with Google'}</button>}
            </div>
            {loginError && <p className="intro-error">{loginError}</p>}
            <small className="intro-note"><ShieldCheck size={14}/> No account is required to view air-quality data. Sign-in is only needed for the AI assistant.</small>
          </div>
          <div className="intro-preview" aria-label="Live monitoring network snapshot">
            <div className="preview-top"><span>Live monitoring network</span><small>Open-Meteo / modeled</small></div>
            <div className="preview-reading" style={{ '--preview-color': '#60a5fa' } as CSSProperties}>
              <span>CITY LOCATIONS CURRENTLY LOADED</span>
              <strong>{readings.length ? <CountUp key={readings.length} from={0} to={readings.length} duration={0.6}/> : '...'}</strong>
              <em>{readings.length ? 'Current network snapshot' : 'Retrieving live locations'}</em>
            </div>
            <div className="preview-line preview-metrics">
              <span><b>Priority now</b>{priorityReading ? `${priorityReading.city} / ${Math.round(priorityReading.value)} AQI` : 'Loading'}</span>
              <span><b>Above AQI 100</b>{readings.length ? `${elevatedLocations} locations` : 'Loading'}</span>
              <span><b>Planning</b>24-hour city outlooks</span>
            </div>
          </div>
        </section>
        <section className="intro-features">
          <article><Map/><h2>Explore the map</h2><p>View modeled conditions at fixed city-center coordinates with clear AQI categories.</p></article>
          <article><CloudSun/><h2>Plan the next 24 hours</h2><p>Use the hourly outlook to choose a better time for outdoor activity.</p></article>
          <article><Database/><h2>See the source</h2><p>Observation time, units, provider, and limitations stay visible throughout the app.</p></article>
          <article><Bot/><h2>Ask for an explanation</h2><p>Get plain-language AQI help grounded in the city reading you selected.</p></article>
        </section>
      </main>
      <footer><span>Data from Open-Meteo</span><span>Modeled values are not regulatory monitor readings or medical advice.</span></footer>
    </motion.div>
  );
}
