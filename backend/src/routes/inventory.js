const router = require('express').Router();
const auth = require('../middleware/auth');
const { branchFilter } = require('../middleware/branchFilter');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /api/inventory — 지점별 재고 (Super Admin: 전체, Branch: 자기 지점)
router.get('/', auth, branchFilter, async (req, res, next) => {
  try {
    const where = req.isSuperAdmin ? {} : { branchId: req.userBranchId };
    const data = await prisma.inventory.findMany({
      where,
      include: {
        product: { include: { category: true } },
        branch: true,
      },
      orderBy: [{ branch: { id: 'asc' } }, { product: { partNo: 'asc' } }],
    });
    res.json(data);
  } catch (err) { next(err); }
});

// GET /api/inventory/matrix — 상품별 전 지점 재고 비교 (Super Admin만)
router.get('/matrix', auth, async (req, res, next) => {
  try {
    const [products, branches, inventory] = await Promise.all([
      prisma.product.findMany({ where:{isActive:true}, include:{category:true}, orderBy:{partNo:'asc'} }),
      prisma.branch.findMany({ where:{isActive:true}, orderBy:{id:'asc'} }),
      prisma.inventory.findMany({ include:{ product:true, branch:true } }),
    ]);

    const matrix = products.map(p => ({
      product: p,
      branches: branches.map(b => {
        const inv = inventory.find(i => i.productId === p.id && i.branchId === b.id);
        return { branch: b, quantity: inv?.quantity || 0, location: inv?.location || '-' };
      }),
    }));
    res.json({ products, branches, matrix });
  } catch (err) { next(err); }
});

// GET /api/inventory/low-stock — 재고 부족
router.get('/low-stock', auth, branchFilter, async (req, res, next) => {
  try {
    const where = req.isSuperAdmin ? {} : { branchId: req.userBranchId };
    const inv = await prisma.inventory.findMany({
      where, include: { product: true, branch: true }
    });
    res.json(inv.filter(i => i.quantity <= i.product.minStock));
  } catch (err) { next(err); }
});

// GET /api/inventory/warehouses — 지점 목록 (재고용)
router.get('/warehouses', auth, async (req, res, next) => {
  try {
    res.json(await prisma.branch.findMany({ where: { isActive: true }, orderBy: { id: 'asc' } }));
  } catch (err) { next(err); }
});

// PATCH /api/inventory/adjust — 재고 조정
router.patch('/adjust', auth, branchFilter, async (req, res, next) => {
  try {
    const { productId, branchId, quantity, location } = req.body;
    const targetBranchId = req.isSuperAdmin ? branchId : req.userBranchId;
    const inv = await prisma.inventory.upsert({
      where: { productId_branchId: { productId: Number(productId), branchId: Number(targetBranchId) } },
      update: { quantity: Number(quantity), ...(location && { location }) },
      create: { productId: Number(productId), branchId: Number(targetBranchId), quantity: Number(quantity), location },
    });
    res.json(inv);
  } catch (err) { next(err); }
});

// POST /api/inventory/transfer — 지점 간 재고 이동 (Super Admin만)
router.post('/transfer', auth, async (req, res, next) => {
  try {
    const { productId, fromBranchId, toBranchId, quantity } = req.body;
    await prisma.$transaction(async (tx) => {
      await tx.inventory.update({
        where: { productId_branchId: { productId: Number(productId), branchId: Number(fromBranchId) } },
        data: { quantity: { decrement: Number(quantity) } },
      });
      await tx.inventory.upsert({
        where: { productId_branchId: { productId: Number(productId), branchId: Number(toBranchId) } },
        update: { quantity: { increment: Number(quantity) } },
        create: { productId: Number(productId), branchId: Number(toBranchId), quantity: Number(quantity) },
      });
    });
    res.json({ message: '재고 이동 완료' });
  } catch (err) { next(err); }
});

module.exports = router;
