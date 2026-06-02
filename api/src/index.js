import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth.js';
import adminRouter from './routes/admin.js';
import workflowsRouter from './routes/workflows.js';
import commentsRouter from './routes/comments.js';
import analyticsRouter from './routes/analytics.js';
import { requireAuth } from './middleware/auth.js';
import { prisma } from './prisma.js';
import { startCronJobs } from './cron/index.js';
import { runSchedulerJob } from './cron/scheduler.js';
import { runExecutorJob } from './cron/executor.js';

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

// Endpoints to trigger cron jobs on demand (or via Vercel Crons)
app.get('/cron/scheduler', async (req, res) => {
  try {
    await runSchedulerJob();
    res.json({ success: true, message: 'Scheduler job triggered successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/cron/executor', async (req, res) => {
  try {
    await runExecutorJob();
    res.json({ success: true, message: 'Executor job triggered successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Public auth routes (no auth required)
app.use('/auth', authRouter);

// Protected routes (JWT auth required)
app.use('/admin', adminRouter);

// Auth middleware — require valid JWT on all /workflows, /comments and /analytics routes
app.use(['/workflows', '/comments', '/analytics'], requireAuth);

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
