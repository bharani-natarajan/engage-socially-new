import { runSchedulerJob } from './scheduler.js';
import { runExecutorJob } from './executor.js';

export function startCronJobs() {
  console.log('[Cron System] Initializing Scheduler and Executor background crons...');

  // Run Scheduler Job every 1 hour (3,600,000 ms)
  const schedulerInterval = setInterval(runSchedulerJob, 3600000);

  // Run Executor Job every 17 minutes (1,020,000 ms)
  const executorInterval = setInterval(runExecutorJob, 1020000);

  // Run them immediately on startup
  runSchedulerJob();
  runExecutorJob();

  return {
    stop: () => {
      clearInterval(schedulerInterval);
      clearInterval(executorInterval);
      console.log('[Cron System] Crons stopped.');
    }
  };
}

export { runSchedulerJob };
