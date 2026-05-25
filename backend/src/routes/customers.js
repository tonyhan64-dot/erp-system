const router = require('express').Router();
const auth = require('../middleware/auth');
const { branchFilter } = require('../middleware/branchFilter');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /api/customers
router.get('/', auth, branchFilter, async (req, res, next) => {
  try {
    const where = { isActive: true };
    if (!req.isSuperAdmin) where.branchId = req.userBranchId;
    if (req.query.search) where.OR = [
      { name: { contains: req.query.search, mode:'insensitive' } },
      { phone: { contains: req.query.search, mode:'insensitive' } },
      { email: { contains: req.query.search, mode:'insensitive' } },
    ];
    const [total, data] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        include: { branch:true, _count:{ select:{ sales:true } } },
        orderBy: { name:'asc' },
      }),
    ]);
    res.json({ total, data });
  } catch (err) { next(err); }
});

// GET /api/customers/:id — Customer detail with transaction history
router.get('/:id', auth, async (req, res, next) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        branch: true,
        sales: {
          include: { items: { include: { product: true } } },
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
        invoices: { orderBy: { createdAt: 'desc' }, take: 20 },
        payments: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const totalPurchased = customer.sales.reduce((s,sale) => s + Number(sale.totalAmount), 0);
    const totalPaid = customer.payments.reduce((s,p) => s + Number(p.amount), 0);
    const outstanding = totalPurchased - totalPaid;

    res.json({ ...customer, totalPurchased, totalPaid, outstanding });
  } catch (err) { next(err); }
});

// POST /api/customers
router.post('/', auth, branchFilter, async (req, res, next) => {
  try {
    const branchId = req.isSuperAdmin ? (req.body.branchId || null) : req.userBranchId;
    const customer = await prisma.customer.create({
      data: { ...req.body, branchId: branchId ? Number(branchId) : null },
    });
    res.status(201).json(customer);
  } catch (err) { next(err); }
});

// PUT /api/customers/:id
router.put('/:id', auth, async (req, res, next) => {
  try {
    const customer = await prisma.customer.update({
      where: { id: Number(req.params.id) },
      data: req.body,
    });
    res.json(customer);
  } catch (err) { next(err); }
});

module.exports = router;
