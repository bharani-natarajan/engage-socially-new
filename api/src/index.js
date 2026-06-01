import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import workflowsRouter from './routes/workflows.js';
import commentsRouter from './routes/comments.js';
import analyticsRouter from './routes/analytics.js';
import { prisma } from './prisma.js';
import { startCronJobs } from './cron/index.js';

const app = express();
const PORT = process.env.PORT ?? 4000;

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:3000')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

app.use(express.json());

// Auth middleware — require x-user-id on all /workflows, /comments and /analytics routes
app.use(['/workflows', '/comments', '/analytics'], (req, res, next) => {
  const userId = req.headers['x-user-id'];
  if (!userId?.trim()) {
    return res.status(401).json({ error: 'x-user-id header is required' });
  }
  req.userId = userId.trim();
  next();
});

app.use('/workflows', workflowsRouter);
app.use('/comments', commentsRouter);
app.use('/analytics', analyticsRouter);

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use((err, _req, res, _next) => {
  console.error(err.message);
  res.status(500).json({ error: err.message });
});

const server = app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
  const crons = startCronJobs();
  app.set('crons', crons);
});

process.on('SIGTERM', async () => {
  const crons = app.get('crons');
  if (crons) crons.stop();
  await prisma.$disconnect();
  server.close();
});
