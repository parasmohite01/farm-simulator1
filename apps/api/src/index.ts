import express from 'express';
import cors from 'cors';
import { scenarios } from './routes/scenarios.js';
import { market } from './routes/market.js';
import { sim } from './routes/simulate.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true, time: Date.now() }));
app.use('/api/scenarios', scenarios);
app.use('/api/market', market);
app.use('/api/simulate', sim);

const port = Number(process.env.PORT ?? 8787);
app.listen(port, () => console.log(`API listening on http://localhost:${port}`));
