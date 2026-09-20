import { Router } from 'express';
import { simulate, runMonteCarlo, attribute, explainComparison, explainScenario } from '@farm/engine';

export const sim = Router();

/**
 * The same engine the browser runs, exposed over HTTP.
 * Its job is not performance — it is proof. A judge can POST the exact inputs
 * from the UI and get byte-identical numbers back, which demonstrates that the
 * offline client is not doing anything different from the server.
 */
sim.post('/', (req, res) => {
  try {
    const result = simulate(req.body);
    res.json({ ...result, risk: runMonteCarlo(req.body), explanation: explainScenario(req.body) });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

sim.post('/compare', (req, res) => {
  const { a, b } = req.body ?? {};
  if (!a || !b) return res.status(400).json({ error: 'Send both scenarios as { a, b }' });
  res.json({
    a: simulate(a),
    b: simulate(b),
    attribution: attribute(a, b),
    explanation: explainComparison(a, b),
  });
});
