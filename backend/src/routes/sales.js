const router = require('express').Router();
const auth = require('../middleware/auth');
const { branchFilter } = require('../middleware/branchFilter');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const genSaleNo = () => `S-${Date.now().toString().slice(-6)}`;

// GET /api/sales
router.get('/', auth, branchFilter, async (req, res, next) => {
  try {
    const where = req.isSuperAdmin ? {} : { branchId: req.userBranchId };
    const { search, from, to, page=1, limit=50 } = req.query;
    if (search) where.OR = [
      { saleNo: { contains: search, mode:'insensitive' } },
      { customer: { name: { contains: search, mode:'insensitive' } } },
    ];
    if (from) where.createdAt = { gte: new Date(from) };
    if (to)   where.createdAt = { ...where.createdAt, lte: new Date(to) };

    const [total, data] = await Promise.all([
      prisma.sale.count({ where }),
      prisma.sale.findMany({
        where,
        include: { customer:true, branch:true, items:{ include:{ product:true } } },
        orderBy: { createdAt:'desc' },
        skip: (page-1)*Number(limit), take: Number(limit),
      }),
    ]);
    res.json({ total, data });
  } catch (err) { next(err); }
});

// POST /api/sales
router.post('/', auth, branchFilter, async (req, res, next) => {
  try {
    const { customerId, items, notes } = req.body;
    const branchId = req.isSuperAdmin ? (req.body.branchId || req.userBranchId) : req.userBranchId;

    if (!items || items.length === 0)
      return res.status(400).json({ error: 'At least one item is required' });

    const totalAmount = items.reduce((s,i) => s + Number(i.quantity)*Number(i.unitPrice), 0);

    const sale = await prisma.$transaction(async (tx) => {
      // Create sale
      const s = await tx.sale.create({
        data: {
          saleNo: genSaleNo(),
          customerId: Number(customerId),
          branchId: Number(branchId),
          totalAmount,
          status: 'Completed',
          notes,
          items: {
            create: items.map(i => ({
              productId: Number(i.productId),
              quantity: Number(i.quantity),
              unitPrice: Number(i.unitPrice),
              subtotal: Number(i.quantity) * Number(i.unitPrice),
            })),
          },
        },
        include: { customer:true, items:{ include:{ product:true } } },
      });

      // Deduct inventory
      for (const item of items) {
        await tx.inventory.updateMany({
          where: { productId: Number(item.productId), branchId: Number(branchId) },
          data: { quantity: { decrement: Number(item.quantity) } },
        });
      }

      // Ledger entry
      await tx.ledger.create({
        data: {
          type: 'Sale',
          description: `Sale to ${s.customer.name} - ${s.saleNo}`,
          credit: totalAmount,
          debit: 0,
          saleId: s.id,
        },
      });

      return s;
    });

    res.status(201).json(sale);
  } catch (err) { next(err); }
});

// PUT /api/sales/:id/status
router.put('/:id/status', auth, async (req, res, next) => {
  try {
    const sale = await prisma.sale.update({
      where: { id: Number(req.params.id) },
      data: { status: req.body.status },
    });
    res.json(sale);
  } catch (err) { next(err); }
});

// DELETE /api/sales/:id
router.delete('/:id', auth, async (req, res, next) => {
  try {
    await prisma.sale.update({
      where: { id: Number(req.params.id) },
      data: { status: 'Cancelled' },
    });
    res.json({ message: 'Sale cancelled successfully' });
  } catch (err) { next(err); }
});

module.exports = router;
