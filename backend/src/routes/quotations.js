const router = require('express').Router();
const auth = require('../middleware/auth');
const { branchFilter } = require('../middleware/branchFilter');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const genQuoteNo = () => `QT-${Date.now().toString().slice(-8)}`;

// GET /api/quotations
router.get('/', auth, branchFilter, async (req, res, next) => {
  try {
    const where = req.isSuperAdmin ? {} : { branchId: req.userBranchId };
    const [total, data] = await Promise.all([
      prisma.quotation.count({ where }),
      prisma.quotation.findMany({
        where,
        include: { customer: true, branch: true, items: { include: { product: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);
    res.json({ total, data });
  } catch (err) { next(err); }
});

// GET /api/quotations/:id
router.get('/:id', auth, async (req, res, next) => {
  try {
    const q = await prisma.quotation.findUnique({
      where: { id: Number(req.params.id) },
      include: { customer: true, branch: true, items: { include: { product: true } } },
    });
    if (!q) return res.status(404).json({ error: '견적서를 찾을 수 없습니다.' });
    res.json(q);
  } catch (err) { next(err); }
});

// POST /api/quotations — 견적서 생성
router.post('/', auth, branchFilter, async (req, res, next) => {
  try {
    const { customerId, items, notes, validDays = 15 } = req.body;
    const branchId = req.isSuperAdmin ? req.body.branchId : req.userBranchId;
    const totalAmount = items.reduce((s, i) => s + Number(i.quantity) * Number(i.unitPrice), 0);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + Number(validDays));

    const q = await prisma.quotation.create({
      data: {
        quoteNo: genQuoteNo(),
        customerId: customerId ? Number(customerId) : null,
        branchId: Number(branchId),
        totalAmount,
        expiresAt,
        notes,
        status: 'Draft',
        items: {
          create: items.map(i => ({
            productId: Number(i.productId),
            quantity: Number(i.quantity),
            unitPrice: Number(i.unitPrice),
            subtotal: Number(i.quantity) * Number(i.unitPrice),
          })),
        },
      },
      include: { customer: true, branch: true, items: { include: { product: true } } },
    });
    res.status(201).json(q);
  } catch (err) { next(err); }
});

// PUT /api/quotations/:id — 견적서 수정
router.put('/:id', auth, async (req, res, next) => {
  try {
    const { customerId, items, notes, status, validDays } = req.body;
    const totalAmount = items ? items.reduce((s, i) => s + Number(i.quantity) * Number(i.unitPrice), 0) : undefined;
    const expiresAt = validDays ? new Date(Date.now() + Number(validDays) * 86400000) : undefined;

    const q = await prisma.$transaction(async (tx) => {
      if (items) {
        await tx.quotationItem.deleteMany({ where: { quotationId: Number(req.params.id) } });
        await tx.quotationItem.createMany({
          data: items.map(i => ({
            quotationId: Number(req.params.id),
            productId: Number(i.productId),
            quantity: Number(i.quantity),
            unitPrice: Number(i.unitPrice),
            subtotal: Number(i.quantity) * Number(i.unitPrice),
          })),
        });
      }
      return tx.quotation.update({
        where: { id: Number(req.params.id) },
        data: {
          ...(customerId !== undefined && { customerId: customerId ? Number(customerId) : null }),
          ...(totalAmount !== undefined && { totalAmount }),
          ...(expiresAt && { expiresAt }),
          ...(notes !== undefined && { notes }),
          ...(status && { status }),
        },
        include: { customer: true, branch: true, items: { include: { product: true } } },
      });
    });
    res.json(q);
  } catch (err) { next(err); }
});

// POST /api/quotations/:id/convert — 판매로 전환
router.post('/:id/convert', auth, async (req, res, next) => {
  try {
    const q = await prisma.quotation.findUnique({
      where: { id: Number(req.params.id) },
      include: { items: true },
    });
    if (!q) return res.status(404).json({ error: '견적서 없음' });
    if (!q.customerId) return res.status(400).json({ error: '고객을 먼저 선택해주세요.' });

    const sale = await prisma.$transaction(async (tx) => {
      const s = await tx.sale.create({
        data: {
          saleNo: `S-${Date.now().toString().slice(-6)}`,
          customerId: q.customerId,
          branchId: q.branchId,
          totalAmount: q.totalAmount,
          status: '완료',
          notes: `견적서 ${q.quoteNo} 전환`,
          items: {
            create: q.items.map(i => ({
              productId: i.productId,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              subtotal: i.subtotal,
            })),
          },
        },
        include: { customer: true, items: { include: { product: true } } },
      });
      // 재고 차감
      for (const item of q.items) {
        await tx.inventory.updateMany({
          where: { productId: item.productId, branchId: q.branchId },
          data: { quantity: { decrement: item.quantity } },
        });
      }
      // 장부 기록
      await tx.ledger.create({
        data: { type:'수입', description:`판매 - ${s.customer.name} (견적 전환)`, credit: q.totalAmount, saleId: s.id },
      });
      // 견적서 상태 업데이트
      await tx.quotation.update({
        where: { id: q.id },
        data: { status: 'Converted', convertedSaleId: s.id },
      });
      return s;
    });
    res.json({ message: '판매로 전환되었습니다.', sale });
  } catch (err) { next(err); }
});

// PATCH /api/quotations/:id/status
router.patch('/:id/status', auth, async (req, res, next) => {
  try {
    const q = await prisma.quotation.update({
      where: { id: Number(req.params.id) },
      data: { status: req.body.status },
    });
    res.json(q);
  } catch (err) { next(err); }
});

// DELETE /api/quotations/:id
router.delete('/:id', auth, async (req, res, next) => {
  try {
    await prisma.quotation.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: '삭제되었습니다.' });
  } catch (err) { next(err); }
});

module.exports = router;
