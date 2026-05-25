const router = require('express').Router();
const auth = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

router.get('/', auth, async (req, res, next) => {
  try {
    const data = await prisma.category.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { name: 'asc' },
    });
    res.json(data);
  } catch (err) { next(err); }
});

router.post('/', auth, async (req, res, next) => {
  try { res.status(201).json(await prisma.category.create({ data: req.body })); }
  catch (err) { next(err); }
});

router.put('/:id', auth, async (req, res, next) => {
  try { res.json(await prisma.category.update({ where: { id: Number(req.params.id) }, data: req.body })); }
  catch (err) { next(err); }
});

module.exports = router;
