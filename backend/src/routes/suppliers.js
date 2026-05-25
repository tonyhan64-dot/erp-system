const router = require('express').Router();
const auth = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

router.get('/', auth, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const where = search ? { name: { contains: search, mode: 'insensitive' } } : {};
    const [total, data] = await Promise.all([
      prisma.supplier.count({ where }),
      prisma.supplier.findMany({ where, orderBy: { name: 'asc' }, skip: (page-1)*limit, take: Number(limit) }),
    ]);
    res.json({ total, data });
  } catch (err) { next(err); }
});

router.post('/', auth, async (req, res, next) => {
  try { res.status(201).json(await prisma.supplier.create({ data: req.body })); }
  catch (err) { next(err); }
});

router.put('/:id', auth, async (req, res, next) => {
  try { res.json(await prisma.supplier.update({ where: { id: Number(req.params.id) }, data: req.body })); }
  catch (err) { next(err); }
});

module.exports = router;
