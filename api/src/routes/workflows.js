import { Router } from 'express';
import { prisma } from '../prisma.js';

const router = Router();

// GET /workflows
router.get('/', async (req, res, next) => {
  try {
    const workflows = await prisma.workflow.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { comments: true } } },
    });
    const data = workflows.map(({ _count, ...w }) => ({
      ...w,
      commentCount: _count.comments,
    }));
    res.json({ data });
  } catch (err) { next(err); }
});

// POST /workflows
router.post('/', async (req, res, next) => {
  try {
    const { name, type, keyword, creatorName, creatorUrl, creatorIdentifier } = req.body;

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
      },
    });
    res.status(201).json({ data });
  } catch (err) { next(err); }
});

// PATCH /workflows/:id
router.patch('/:id', async (req, res, next) => {
  try {
    const { lastRunAt, commentsGenerated } = req.body;
    const data = await prisma.workflow.update({
      where: { id: req.params.id, userId: req.userId },
      data: {
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
      })),
    });
    res.status(201).json({ data });
  } catch (err) { next(err); }
});

export default router;
