const router = require('express').Router();
const auth = require('../middleware/auth');
const { superAdminOnly } = require('../middleware/branchFilter');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const calcPrices = async (cost) => {
  const settings = await prisma.setting.findMany({ where:{ key:{ in:['vat_rate','a_markup','b_markup'] } } });
  const cfg = Object.fromEntries(settings.map(s => [s.key, Number(s.value)]));
  const vat = cfg.vat_rate || 15;
  const aMk = cfg.a_markup || 10;
  const bMk = cfg.b_markup || 35;
  const withVat = Number(cost) * (1 + vat/100);
  return {
    aPrice: Math.round(withVat * (1 + aMk/100) * 100) / 100,
    bPrice: Math.round(withVat * (1 + bMk/100) * 100) / 100,
    cPrice: Math.round(withVat * (1 + bMk/100) * (1 + vat/100) * 100) / 100,
  };
};

// GET /api/products — 검색 (partNo, brand, name, carBrand, carModel)
router.get('/', auth, async (req, res, next) => {
  try {
    const { search, categoryId, page=1, limit=50 } = req.query;
    const where = { isActive: true };
    if (search) {
      where.OR = [
        { partNo:   { contains: search, mode:'insensitive' } },
        { name:     { contains: search, mode:'insensitive' } },
        { brand:    { contains: search, mode:'insensitive' } },
        { carBrand: { contains: search, mode:'insensitive' } },
        { carModel: { contains: search, mode:'insensitive' } },
      ];
    }
    if (categoryId) where.categoryId = Number(categoryId);
    const [total, data] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        include: { category: true },
        orderBy: { partNo: 'asc' },
        skip: (page-1)*Number(limit), take: Number(limit),
      }),
    ]);
    res.json({ total, data });
  } catch (err) { next(err); }
});

// POST /api/products
router.post('/', auth, superAdminOnly, async (req, res, next) => {
  try {
    const prices = await calcPrices(req.body.cost || 0);
    const product = await prisma.product.create({
      data: { ...req.body, ...prices, categoryId: req.body.categoryId ? Number(req.body.categoryId) : null },
      include: { category: true },
    });
    res.status(201).json(product);
  } catch (err) { next(err); }
});

// PUT /api/products/:id
router.put('/:id', auth, superAdminOnly, async (req, res, next) => {
  try {
    const prices = req.body.cost !== undefined ? await calcPrices(req.body.cost) : {};
    const product = await prisma.product.update({
      where: { id: Number(req.params.id) },
      data: { ...req.body, ...prices },
      include: { category: true },
    });
    res.json(product);
  } catch (err) { next(err); }
});

router.get('/calc-price', auth, async (req, res, next) => {
  try { res.json(await calcPrices(req.query.cost || 0)); }
  catch (err) { next(err); }
});

router.delete('/:id', auth, superAdminOnly, async (req, res, next) => {
  try {
    await prisma.product.update({ where:{id:Number(req.params.id)}, data:{isActive:false} });
    res.json({ message:'비활성화되었습니다.' });
  } catch (err) { next(err); }
});

module.exports = router;
