const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true, branch: true }
    });
    if (!user || !await bcrypt.compare(password, user.password))
      return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    if (!user.isActive)
      return res.status(403).json({ error: '비활성화된 계정입니다.' });

    const token = jwt.sign({
      id: user.id,
      email: user.email,
      role: user.role.name,
      branchId: user.branchId,
      branchName: user.branch?.name || null,
    }, process.env.JWT_SECRET, { expiresIn: '8h' });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role.name,
        branchId: user.branchId,
        branchName: user.branch?.name || null,
      }
    });
  } catch (err) { next(err); }
});

// GET /api/auth/me
router.get('/me', require('../middleware/auth'), async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { role: true, branch: true }
    });
    res.json({
      id: user.id, name: user.name, email: user.email,
      role: user.role.name,
      branchId: user.branchId,
      branchName: user.branch?.name || null,
    });
  } catch (err) { next(err); }
});

module.exports = router;
