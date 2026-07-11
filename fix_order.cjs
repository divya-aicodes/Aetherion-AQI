const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf8');

const simValsStart = content.indexOf("const simulatedValues = useMemo(() => {");
const currentSimResultEnd = content.indexOf("  }, [stats, interventions, selectedStrategies]);\n") + "  }, [stats, interventions, selectedStrategies]);\n".length;

const beforeSimVals = content.substring(0, simValsStart);
const simValsToBothHistogramDataEnd = content.substring(simValsStart, content.indexOf("const strategyReasoning =", simValsStart));
const strategyToCurrentSimResultEnd = content.substring(content.indexOf("const strategyReasoning =", simValsStart), currentSimResultEnd);
const afterCurrentSimResultEnd = content.substring(currentSimResultEnd);

fs.writeFileSync('src/App.tsx', beforeSimVals + strategyToCurrentSimResultEnd + simValsToBothHistogramDataEnd + afterCurrentSimResultEnd);
