import { Router } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../prisma.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();
const SALT_ROUNDS = 12;

// All admin routes require authentication + admin role
router.use(requireAuth, requireAdmin);

/* ------------------------------------------------------------------ */
/*  GET /admin/users — List all users                                 */
/* ------------------------------------------------------------------ */
router.get('/users', async (req, res, next) => {
  try {
    const { search, role, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (search?.trim()) {
      where.OR = [
        { firstName: { contains: search.trim(), mode: 'insensitive' } },
        { lastName: { contains: search.trim(), mode: 'insensitive' } },
        { email: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }
    if (role && ['user', 'admin'].includes(role)) {
      where.role = role;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          role: true,
          verified: true,
          createdAt: true,
          _count: { select: { workflows: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      data: users.map(u => ({
        ...u,
        workflowCount: u._count.workflows,
        _count: undefined,
      })),
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) { next(err); }
});

/* ------------------------------------------------------------------ */
/*  GET /admin/users/:id — Get a specific user with their data        */
/* ------------------------------------------------------------------ */
router.get('/users/:id', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        verified: true,
        createdAt: true,
        workflows: {
          orderBy: { createdAt: 'desc' },
          include: {
            _count: { select: { comments: true } },
          },
        },
      },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({ data: user });
  } catch (err) { next(err); }
});

/* ------------------------------------------------------------------ */
/*  POST /admin/users — Create a new user (admin creates user)        */
/* ------------------------------------------------------------------ */
router.post('/users', async (req, res, next) => {
  try {
    const { firstName, lastName, email, phone, role } = req.body;

    if (!firstName?.trim()) return res.status(400).json({ error: 'First name is required' });
    if (!email?.trim()) return res.status(400).json({ error: 'Email is required' });

    const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (existing) return res.status(409).json({ error: 'An account with this email already exists' });

    const user = await prisma.user.create({
      data: {
        firstName: firstName.trim(),
        lastName: lastName?.trim() ?? '',
        email: email.trim().toLowerCase(),
        phone: phone?.trim() ?? '',
        role: role === 'admin' ? 'admin' : 'user',
        verified: true, // Admin-created users are pre-verified
      },
    });

    res.status(201).json({
      data: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        verified: user.verified,
        createdAt: user.createdAt,
      },
    });
  } catch (err) { next(err); }
});

/* ------------------------------------------------------------------ */
/*  PATCH /admin/users/:id — Update a user (role, etc.)               */
/* ------------------------------------------------------------------ */
router.patch('/users/:id', async (req, res, next) => {
  try {
    const { firstName, lastName, phone, role } = req.body;
    const data = {};
    if (firstName !== undefined) data.firstName = firstName.trim();
    if (lastName !== undefined) data.lastName = lastName.trim();
    if (phone !== undefined) data.phone = phone.trim();
    if (role !== undefined && ['user', 'admin'].includes(role)) data.role = role;

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: {
        id: true, firstName: true, lastName: true, email: true,
        phone: true, role: true, verified: true, createdAt: true,
      },
    });

    res.json({ data: user });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'User not found' });
    next(err);
  }
});

/* ------------------------------------------------------------------ */
/*  DELETE /admin/users/:id — Delete a user                           */
/* ------------------------------------------------------------------ */
router.delete('/users/:id', async (req, res, next) => {
  try {
    // Prevent deleting yourself
    if (req.params.id === req.userId) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }

    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'User not found' });
    next(err);
  }
});

/* ------------------------------------------------------------------ */
/*  POST /admin/link-workflows — Link workflows to a user             */
/* ------------------------------------------------------------------ */
router.post('/link-workflows', async (req, res, next) => {
  try {
    const { userId, workflowIds } = req.body;
    if (!userId || !Array.isArray(workflowIds) || !workflowIds.length) {
      return res.status(400).json({ error: 'userId and workflowIds array are required' });
    }

    // Verify user exists
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Update workflows
    const result = await prisma.workflow.updateMany({
      where: { id: { in: workflowIds } },
      data: { userId },
    });

    res.json({ success: true, updated: result.count });
  } catch (err) { next(err); }
});

/* ------------------------------------------------------------------ */
/*  GET /admin/stats — Dashboard statistics                           */
/* ------------------------------------------------------------------ */
router.get('/stats', async (req, res, next) => {
  try {
    const [totalUsers, totalWorkflows, totalComments, recentUsers] = await Promise.all([
      prisma.user.count(),
      prisma.workflow.count(),
      prisma.workflowComment.count(),
      prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, firstName: true, lastName: true, email: true, createdAt: true },
      }),
    ]);

    res.json({ data: { totalUsers, totalWorkflows, totalComments, recentUsers } });
  } catch (err) { next(err); }
});

export default router;
