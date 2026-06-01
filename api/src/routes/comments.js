import { Router } from 'express';
import { prisma } from '../prisma.js';

const router = Router();

// PATCH /comments/:id
router.patch('/:id', async (req, res, next) => {
  try {
    const { status, scheduledAt, postedAt, errorMessage } = req.body;
    const allowed = ['pending', 'approved', 'posted', 'failed'];
    if (status && !allowed.includes(status))
      return res.status(400).json({ error: `status must be one of: ${allowed.join(', ')}` });

    // Verify ownership via join
    const existing = await prisma.workflowComment.findFirst({
      where: { id: req.params.id, workflow: { userId: req.userId } },
      select: { id: true },
    });
    if (!existing) return res.status(404).json({ error: 'Comment not found' });

    const data = await prisma.workflowComment.update({
      where: { id: req.params.id },
      data: {
        ...(status !== undefined && { status }),
        ...(scheduledAt !== undefined && { scheduledAt: scheduledAt ? new Date(scheduledAt) : null }),
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
