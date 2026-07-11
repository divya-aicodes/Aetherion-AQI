export interface AQIStrategy {
  id: string;
  name: string;
  description: string;
  behavior: string;
  aqiImpact: string;
  recommendation: string;
  modifierRange: [number, number]; // [min, max] percentage reduction
}

export const STRATEGIES: AQIStrategy[] = [
  {
    id: "tit-for-tat",
    name: "Tit-for-Tat",
    description: "Cooperates on the first move, then mimics the opponent's previous move.",
    behavior: "Reciprocal and fair.",
    aqiImpact: "Stabilizes if others are cooperative.",
    recommendation: "Standard industrial policy benchmark.",
    modifierRange: [0.10, 0.20]
  },
  {
    id: "generous-tft",
    name: "Generous TFT",
    description: "Like TFT, but occasionally forgives a defection to prevent feedback loops.",
    behavior: "Forgiving, avoids endless cycles of defection.",
    aqiImpact: "High stability in noisy environments.",
    recommendation: "Use in volatile markets.",
    modifierRange: [0.12, 0.22]
  },
  {
    id: "pavlov",
    name: "Pavlov (Win-Stay, Lose-Shift)",
    description: "Repeat previous move if it was successful, else switch.",
    behavior: "Reflexive adaptation.",
    aqiImpact: "Efficiently exploits weak defectors.",
    recommendation: "Effective against random actors.",
    modifierRange: [0.14, 0.24]
  },
  {
    id: "forgiving-strategy",
    name: "Forgiving Strategy",
    description: "Accepts multiple defections before retaliating.",
    behavior: "Highly cooperative.",
    aqiImpact: "Risk of exploitation by bad actors.",
    recommendation: "Use for small, essential industries.",
    modifierRange: [0.08, 0.18]
  },
  {
    id: "majority",
    name: "Majority Strategy",
    description: "Does what the majority of other actors did in the last round.",
    behavior: "Conformist.",
    aqiImpact: "Reinforces existing trends.",
    recommendation: "Use for mass public campaigns.",
    modifierRange: [0.11, 0.21]
  },
  {
    id: "pattern-detection",
    name: "Pattern Detection",
    description: "Analyzes opponent sequences to predict and counter defections.",
    behavior: "Analytical and strategic.",
    aqiImpact: "Highly efficient interventions.",
    recommendation: "Best for government monitoring agencies.",
    modifierRange: [0.20, 0.30]
  },
  {
    id: "regret-minimization",
    name: "Regret Minimization",
    description: "Chooses moves that minimize potential worst-case pollution scenarios.",
    behavior: "Risk-averse and safe.",
    aqiImpact: "Lowest probability of extreme spikes.",
    recommendation: "Essential for dense urban environments.",
    modifierRange: [0.22, 0.32]
  }
];
