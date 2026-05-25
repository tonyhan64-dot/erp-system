const router = require('express').Router();
const auth = require('../middleware/auth');
const { superAdminOnly } = require('../middleware/branchFilter');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /api/branches — 지점 목록 (모든 로그인 사용자)
router.get('/', auth, async (req, res, next) => {
  try {
    const branches = await prisma.branch.findMany({
      where: { isActive: true },
      include: {
        _count: { select: { users: true, inventory: true, sales: true } }
      },
      orderBy: { id: 'asc' }
    });
    res.json(branches);
  } catch (err) { next(err); }
});

// POST /api/branches — 지점 생성 (Super Admin만)
router.post('/', auth, superAdminOnly, async (req, res, next) => {
  try {
    const branch = await prisma.branch.create({ data: req.body });
    res.status(201).json(branch);
  } catch (err) { next(err); }
});

// PUT /api/branches/:id — 지점 수정
router.put('/:id', auth, superAdminOnly, async (req, res, next) => {
  try {
    const branch = await prisma.branch.update({
      where: { id: Number(req.params.id) },
      data: req.body
    });
    res.json(branch);
  } catch (err) { next(err); }
});

// DELETE /api/branches/:id — 지점 비활성화
router.delete('/:id', auth, superAdminOnly, async (req, res, next) => {
  try {
    await prisma.branch.update({
      where: { id: Number(req.params.id) },
      data: { isActive: false }
    });
    res.json({ message: '지점이 비활성화되었습니다.' });
  } catch (err) { next(err); }
});

// POST /api/branches/:id/manager — 지점장 계정 생성 (Super Admin만)
router.post('/:id/manager', auth, superAdminOnly, async (req, res, next) => {
  try {
    const { name, email, password, roleId } = req.body;
    const branchId = Number(req.params.id);
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hashed, roleId: Number(roleId), branchId },
      include: { role: true, branch: true }
    });
    res.status(201).json({ ...user, password: undefined });
  } catch (err) { next(err); }
});

module.exports = router;
