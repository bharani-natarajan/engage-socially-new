import { Router } from 'express';
import { prisma } from '../prisma.js';
import { runSchedulerJob, getScheduledTimeInIST } from '../cron/scheduler.js';

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
    const { name, type, keyword, creatorName, creatorUrl, creatorIdentifier, autoPost, commentLength, commentsPerDay, brandContext, tone, avoid } = req.body;

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

    // Run the scheduler job immediately for this workflow
    try {
      await runSchedulerJob(data.id, { brandContext, tone, avoid });
    } catch (schedErr) {
      console.error('[POST /workflows runSchedulerJob Error]', schedErr);
    }

    // Retrieve generated comments
    const comments = await prisma.workflowComment.findMany({
      where: { workflowId: data.id },
      orderBy: { createdAt: 'desc' }
    });

    res.status(201).json({ data: {
      ...data,
      commentCount: comments.length,
      pendingComments: comments.filter(c => c.status === 'pending'),
      comments,
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
    const { name, keyword, creatorName, creatorUrl, creatorIdentifier, autoPost, commentLength, commentsPerDay, lastRunAt, commentsGenerated, timezone, brandContext, tone, avoid } = req.body;
    
    // Check if the target is changing
    const oldWf = await prisma.workflow.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!oldWf) return res.status(404).json({ error: 'Workflow not found' });

    let targetChanged = false;
    if (keyword !== undefined && keyword !== oldWf.keyword) targetChanged = true;
    if (creatorUrl !== undefined && creatorUrl !== oldWf.creatorUrl) targetChanged = true;

    // Update the workflow
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
        ...(lastRunAt !== undefined && { lastRunAt: lastRunAt === null ? null : new Date(lastRunAt) }),
        ...(commentsGenerated !== undefined && { commentsGenerated }),
      },
    });

    // If autoPost is modified, update existing comments status accordingly:
    // If turned ON (autoPost === true): change "pending" comments to "scheduled" and assign scheduled time.
    // If turned OFF (autoPost === false): change "scheduled" comments to "pending" and remove scheduled time.
    if (autoPost !== undefined && autoPost !== oldWf.autoPost) {
      if (autoPost === true) {
        const pendingComments = await prisma.workflowComment.findMany({
          where: { workflowId: data.id, status: 'pending' }
        });
        await Promise.all(
          pendingComments.map(c => 
            prisma.workflowComment.update({
              where: { id: c.id },
              data: {
                status: 'scheduled',
                scheduledAt: getScheduledTimeInIST()
              }
            })
          )
        );
      } else {
        const scheduledComments = await prisma.workflowComment.findMany({
          where: { workflowId: data.id, status: 'scheduled' }
        });
        await Promise.all(
          scheduledComments.map(c => 
            prisma.workflowComment.update({
              where: { id: c.id },
              data: {
                status: 'pending',
                scheduledAt: null
              }
            })
          )
        );
      }
    }
    // If commentsPerDay is increased, immediately run scheduler to generate additional comments
    if (commentsPerDay !== undefined && parseInt(commentsPerDay, 10) > oldWf.commentsPerDay) {
      try {
        await runSchedulerJob(data.id, { brandContext, tone, avoid });
      } catch (err) {
        console.error(`[PATCH /workflows/:id] Scheduler run failed:`, err);
      }
    }

    // Retrieve comments to send updated workflow state back to frontend
    const comments = await prisma.workflowComment.findMany({
      where: { workflowId: data.id },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      data: {
        ...data,
        commentCount: comments.length,
        pendingComments: comments.filter(c => c.status === 'pending'),
        comments,
      }
    });
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

// POST /workflows/:id/run — run scheduler for a specific workflow
router.post('/:id/run', async (req, res, next) => {
  try {
    const { brandContext, tone, avoid } = req.body;
    
    // Verify ownership
    const workflow = await prisma.workflow.findFirst({
      where: { id: req.params.id, userId: req.userId },
      select: { id: true }
    });
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' });

    // Run scheduler job immediately for this workflow in background
    runSchedulerJob(workflow.id, { brandContext, tone, avoid })
      .then(() => console.log(`[POST /workflows/:id/run] Background run finished for ${workflow.id}`))
      .catch(err => console.error(`[POST /workflows/:id/run] Background run failed for ${workflow.id}:`, err));

    res.json({ success: true, message: 'Scheduler run triggered in background' });
  } catch (err) { next(err); }
});

async function rewriteCommentText(postAuthor, postText, commentLength, brandContext, tone, avoid) {
  const geminiApiKey = process.env.GEMINI_API_KEY ?? '';
  if (!geminiApiKey) return null;

  const toneInstructions = {
    friendly: 'Write in a warm, approachable, and conversational tone.',
    professional: 'Write in a polished, professional, and brand-appropriate tone.',
    casual: 'Write in a relaxed, informal, and relatable tone.',
    witty: 'Write in a light-hearted tone with a touch of humour.',
  };

  const lengthInstructions = {
    short: 'Write a very short, punchy comment (1 brief sentence or phrase, under 15 words).',
    medium: 'Write a medium-sized comment (1-2 sentences).',
    long: 'Write a detailed, insightful comment (3-4 sentences, adding value or asking a relevant question).',
  };

  const parts = [];
  if (brandContext?.trim()) parts.push(`Brand / business context:\n${brandContext.trim()}`);
  parts.push(`LinkedIn post by ${postAuthor ?? 'someone'}:\n"${postText.trim().slice(0, 600)}"`);
  parts.push(toneInstructions[tone] ?? toneInstructions.professional);
  if (avoid?.trim()) parts.push(`Important — do NOT include: ${avoid.trim()}`);

  const lenInstr = lengthInstructions[commentLength] ?? lengthInstructions.medium;
  parts.push(`Write a thoughtful LinkedIn comment on this post. ${lenInstr} No hashtags. Return only the comment text, nothing else.`);

  const promptText = parts.join('\n\n');

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }]
      })
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? null;
  } catch (err) {
    console.error('[rewriteCommentText Error]', err);
    return null;
  }
}

export default router;
