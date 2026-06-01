import { Router } from 'express';
import { prisma } from '../prisma.js';

const router = Router();

// GET /workflows
router.get('/', async (req, res, next) => {
  try {
    const workflows = await prisma.workflow.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      include: {
        comments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    const data = workflows.map(({ comments, ...w }) => ({
      ...w,
      commentCount: comments.length,
      pendingComments: comments.filter(c => c.status === 'pending'),
      comments,
    }));
    res.json({ data });
  } catch (err) { next(err); }
});

// POST /workflows
router.post('/', async (req, res, next) => {
  try {
    const { name, type, keyword, creatorName, creatorUrl, creatorIdentifier, autoPost, commentLength, commentsPerDay } = req.body;

    if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
    if (!['keyword', 'creator'].includes(type))
      return res.status(400).json({ error: 'type must be keyword or creator' });
    if (type === 'keyword' && !keyword?.trim())
      return res.status(400).json({ error: 'keyword is required' });
    if (type === 'creator' && (!creatorName?.trim() || !creatorUrl?.trim()))
      return res.status(400).json({ error: 'creatorName and creatorUrl are required' });

    const data = await prisma.workflow.create({
      data: {
        userId: req.userId,
        name: name.trim(),
        type,
        keyword: keyword?.trim() ?? '',
        creatorName: creatorName?.trim() ?? '',
        creatorUrl: creatorUrl?.trim() ?? '',
        creatorIdentifier: creatorIdentifier?.trim() ?? '',
        autoPost: autoPost ?? false,
        commentLength: commentLength ?? 'medium',
        commentsPerDay: commentsPerDay !== undefined ? parseInt(commentsPerDay, 10) : (type === 'creator' ? 1 : 20),
      },
    });

    res.status(201).json({ data: {
      ...data,
      commentCount: 0,
      pendingComments: [],
      comments: [],
    }});
  } catch (err) { next(err); }
});

function getScheduledTimeInTimezone(timezone) {
  try {
    const now = new Date();
    const localStr = now.toLocaleString('sv-SE', { timeZone: timezone });
    const utcStr = now.toLocaleString('sv-SE', { timeZone: 'UTC' });
    const currentHour = parseInt(localStr.split(' ')[1]?.split(':')[0] ?? '12');

    let targetHour, addDays = 0;
    if (currentHour >= 21) {
      addDays = 1;
      targetHour = 9 + Math.floor(Math.random() * 12);
    } else if (currentHour < 9) {
      targetHour = 9 + Math.floor(Math.random() * 12);
    } else {
      const minH = currentHour + 1;
      if (minH >= 21) { addDays = 1; targetHour = 9 + Math.floor(Math.random() * 12); }
      else targetHour = minH + Math.floor(Math.random() * (21 - minH));
    }
    const targetMin = Math.floor(Math.random() * 60);

    const localNow = new Date(localStr.replace(' ', 'T'));
    const utcNow = new Date(utcStr.replace(' ', 'T'));
    const offsetMinutes = (localNow.getTime() - utcNow.getTime()) / 60000;

    const totalTargetMin = targetHour * 60 + targetMin - offsetMinutes;
    let utcH = Math.floor(totalTargetMin / 60);
    const utcM = Math.round(((totalTargetMin % 60) + 60) % 60);
    let dayAdj = 0;
    if (utcH < 0) { utcH += 24; dayAdj = -1; }
    if (utcH >= 24) { utcH -= 24; dayAdj = 1; }

    const result = new Date(now);
    result.setDate(result.getDate() + addDays + dayAdj);
    result.setUTCHours(utcH, utcM, 0, 0);
    return result;
  } catch {
    return new Date(Date.now() + 3600 * 1000);
  }
}

// PATCH /workflows/:id
router.patch('/:id', async (req, res, next) => {
  try {
    const { name, keyword, creatorName, creatorUrl, creatorIdentifier, autoPost, commentLength, commentsPerDay, lastRunAt, commentsGenerated, timezone } = req.body;
    
    // First update the workflow
    const data = await prisma.workflow.update({
      where: { id: req.params.id, userId: req.userId },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(keyword !== undefined && { keyword: keyword?.trim() ?? '' }),
        ...(creatorName !== undefined && { creatorName: creatorName?.trim() ?? '' }),
        ...(creatorUrl !== undefined && { creatorUrl: creatorUrl?.trim() ?? '' }),
        ...(creatorIdentifier !== undefined && { creatorIdentifier: creatorIdentifier?.trim() ?? '' }),
        ...(autoPost !== undefined && { autoPost }),
        ...(commentLength !== undefined && { commentLength }),
        ...(commentsPerDay !== undefined && { commentsPerDay: parseInt(commentsPerDay, 10) }),
        ...(lastRunAt !== undefined && { lastRunAt: new Date(lastRunAt) }),
        ...(commentsGenerated !== undefined && { commentsGenerated }),
      },
    });

    res.json({ data });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Workflow not found' });
    next(err);
  }
});

// DELETE /workflows/:id
router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.workflow.delete({
      where: { id: req.params.id, userId: req.userId },
    });
    res.json({ success: true });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Workflow not found' });
    next(err);
  }
});

// GET /workflows/:id/comments
router.get('/:id/comments', async (req, res, next) => {
  try {
    // Verify ownership
    const workflow = await prisma.workflow.findUnique({
      where: { id: req.params.id, userId: req.userId },
      select: { id: true },
    });
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' });

    const data = await prisma.workflowComment.findMany({
      where: { workflowId: req.params.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data });
  } catch (err) { next(err); }
});

// POST /workflows/:id/comments — bulk insert
router.post('/:id/comments', async (req, res, next) => {
  try {
    const { comments } = req.body;
    if (!Array.isArray(comments) || !comments.length)
      return res.status(400).json({ error: 'comments array is required' });

    const workflow = await prisma.workflow.findUnique({
      where: { id: req.params.id, userId: req.userId },
      select: { id: true },
    });
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' });

    const data = await prisma.workflowComment.createManyAndReturn({
      data: comments.map(c => ({
        workflowId: req.params.id,
        postId: c.postId,
        postText: c.postText ?? '',
        postAuthor: c.postAuthor ?? '',
        postAuthorHeadline: c.postAuthorHeadline ?? '',
        postUrl: c.postUrl ?? null,
        commentText: c.commentText,
        status: c.status ?? 'pending',
        scheduledAt: c.scheduledAt ? new Date(c.scheduledAt) : null,
      })),
    });
    res.status(201).json({ data });
  } catch (err) { next(err); }
});

export default router;
