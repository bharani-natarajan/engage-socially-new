import { Router } from 'express';
import { prisma } from '../prisma.js';
import { runSchedulerJob } from '../cron/index.js';
import { getScheduledTimeInIST } from '../cron/scheduler.js';

const router = Router();

// GET /comments
router.get('/', async (req, res, next) => {
  try {
    const comments = await prisma.workflowComment.findMany({
      where: {
        workflow: {
          userId: req.userId,
        },
      },
      include: {
        workflow: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: comments });
  } catch (err) { next(err); }
});

// PATCH /comments/:id
router.patch('/:id', async (req, res, next) => {
  try {
    const { status, scheduledAt, postedAt, errorMessage } = req.body;
    const allowed = ['pending', 'approved', 'scheduled', 'posting', 'posted', 'failed', 'rejected'];
    if (status && !allowed.includes(status))
      return res.status(400).json({ error: `status must be one of: ${allowed.join(', ')}` });

    // Verify ownership via join
    const existing = await prisma.workflowComment.findFirst({
      where: { id: req.params.id, workflow: { userId: req.userId } },
      select: { id: true },
    });
    if (!existing) return res.status(404).json({ error: 'Comment not found' });

    let finalStatus = status;
    let finalScheduledAt = scheduledAt;

    if (status === 'approved' || status === 'scheduled') {
      finalStatus = 'scheduled';
      if (!scheduledAt) {
        finalScheduledAt = getScheduledTimeInIST();
      }
    }

    const data = await prisma.workflowComment.update({
      where: { id: req.params.id },
      data: {
        ...(finalStatus !== undefined && { status: finalStatus }),
        ...(finalScheduledAt !== undefined && { scheduledAt: finalScheduledAt ? new Date(finalScheduledAt) : null }),
        ...(postedAt !== undefined && { postedAt: postedAt ? new Date(postedAt) : null }),
        ...(errorMessage !== undefined && { errorMessage }),
      },
    });

    res.json({ data });
  } catch (err) { next(err); }
});

// DELETE /comments/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const existing = await prisma.workflowComment.findFirst({
      where: { id: req.params.id, workflow: { userId: req.userId } },
      select: { id: true },
    });
    if (!existing) return res.status(404).json({ error: 'Comment not found' });

    await prisma.workflowComment.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
