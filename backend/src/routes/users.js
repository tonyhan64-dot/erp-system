const router = require('express').Router();
const auth = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

router.get('/', auth, async (req, res, next) => {
  try {
    const data = await prisma.user.findMany({ include: { role: true }, orderBy: { name: 'asc' } });
    res.json(data.map(u => ({ ...u, password: undefined })));
  } catch (err) { next(err); }
});

router.post('/', auth, async (req, res, next) => {
  try {
    const { email, password, name, roleId } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    const u = await prisma.user.create({ data: { email, password: hashed, name, roleId }, include: { role: true } });
    res.status(201).json({ ...u, password: undefined });
  } catch (err) { next(err); }
});

router.put('/:id', auth, async (req, res, next) => {
  try {
    const { password, ...rest } = req.body;
    const data = { ...rest };
    if (password) data.password = await bcrypt.hash(password, 10);
    const u = await prisma.user.update({ where: { id: Number(req.params.id) }, data, include: { role: true } });
    res.json({ ...u, password: undefined });
  } catch (err) { next(err); }
});

router.get('/roles', auth, async (req, res, next) => {
  try { res.json(await prisma.role.findMany()); }
  catch (err) { next(err); }
});

module.exports = router;
