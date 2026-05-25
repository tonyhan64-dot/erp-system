const router = require('express').Router();
const auth = require('../middleware/auth');
const { branchFilter } = require('../middleware/branchFilter');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const genPONo = () => `PO-${Date.now().toString().slice(-6)}`;

// GET /api/purchases
router.get('/', auth, branchFilter, async (req, res, next) => {
  try {
    const where = req.isSuperAdmin ? {} : { branchId: req.userBranchId };
    const [total, data] = await Promise.all([
      prisma.purchase.count({ where }),
      prisma.purchase.findMany({
        where,
        include: { supplier:true, branch:true, items:{ include:{ product:true } } },
        orderBy: { createdAt:'desc' },
        take: 50,
      }),
    ]);
    res.json({ total, data });
  } catch (err) { next(err); }
});

// POST /api/purchases
router.post('/', auth, branchFilter, async (req, res, next) => {
  try {
    const { supplierId, items, notes } = req.body;
    const branchId = req.isSuperAdmin ? (req.body.branchId || req.userBranchId) : req.userBranchId;

    if (!items || items.length === 0)
      return res.status(400).json({ error: 'At least one item is required' });

    const totalAmount = items.reduce((s,i) => s + Number(i.quantity)*Number(i.unitPrice), 0);

    const purchase = await prisma.$transaction(async (tx) => {
      const p = await tx.purchase.create({
        data: {
          purchaseNo: genPONo(),
          supplierId: Number(supplierId),
          branchId: Number(branchId),
          totalAmount,
          status: 'Received',
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
        include: { supplier:true, items:{ include:{ product:true } } },
      });

      // Add to inventory
      for (const item of items) {
        await tx.inventory.upsert({
          where: { productId_branchId: { productId: Number(item.productId), branchId: Number(branchId) } },
          update: { quantity: { increment: Number(item.quantity) } },
          create: { productId: Number(item.productId), branchId: Number(branchId), quantity: Number(item.quantity) },
        });
      }

      // Ledger entry
      await tx.ledger.create({
        data: {
          type: 'Purchase',
          description: `Purchase from ${p.supplier.name} - ${p.purchaseNo}`,
          debit: totalAmount,
          credit: 0,
          purchaseId: p.id,
        },
      });

      return p;
    });

    res.status(201).json(purchase);
  } catch (err) { next(err); }
});

module.exports = router;
