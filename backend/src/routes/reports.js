const router = require('express').Router();
const auth = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 대시보드 통계
router.get('/dashboard', auth, async (req, res, next) => {
  try {
    const today = new Date(); today.setHours(0,0,0,0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [todaySales, monthSales, lowStock, totalCustomers, recentSales, ledger, expenses, unpaid] = await Promise.all([
      prisma.sale.aggregate({ where:{ createdAt:{ gte:today } }, _sum:{ totalAmount:true }, _count:true }),
      prisma.sale.aggregate({ where:{ createdAt:{ gte:monthStart } }, _sum:{ totalAmount:true }, _count:true }),
      prisma.inventory.count({ where:{ quantity:{ lte:10 } } }),
      prisma.customer.count({ where:{ isActive:true } }),
      prisma.sale.findMany({ take:6, orderBy:{ createdAt:'desc' }, include:{ customer:true } }),
      prisma.ledger.aggregate({ _sum:{ credit:true, debit:true } }),
      prisma.expense.aggregate({ _sum:{ amount:true } }),
      prisma.sale.aggregate({ where:{ paidAmount:{ lt:prisma.sale.fields.totalAmount } }, _sum:{ totalAmount:true } }),
    ]);

    // 카테고리별 매출
    const salesWithItems = await prisma.sale.findMany({
      include: { items: { include: { product: { include: { category: true } } } } }
    });
    const categoryMap = {};
    salesWithItems.forEach(sale => {
      sale.items.forEach(item => {
        const cat = item.product.category?.name || '미분류';
        categoryMap[cat] = (categoryMap[cat] || 0) + Number(item.subtotal);
      });
    });
    const categoryStats = Object.entries(categoryMap)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a,b) => b.amount - a.amount)
      .slice(0,5);

    res.json({
      todaySales: { amount: todaySales._sum.totalAmount || 0, count: todaySales._count },
      monthSales: { amount: monthSales._sum.totalAmount || 0, count: monthSales._count },
      lowStockCount: lowStock,
      totalCustomers,
      recentSales,
      totalRevenue: ledger._sum.credit || 0,
      totalExpense: (ledger._sum.debit || 0) + (expenses._sum.amount || 0),
      unpaidAmount: unpaid._sum.totalAmount || 0,
      categoryStats,
    });
  } catch (err) { next(err); }
});

// 월별 매출 (최근 6개월)
router.get('/monthly-sales', auth, async (req, res, next) => {
  try {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const [sales, expenses] = await Promise.all([
        prisma.sale.aggregate({ where:{ createdAt:{ gte:start, lte:end } }, _sum:{ totalAmount:true } }),
        prisma.expense.aggregate({ where:{ date:{ gte:start, lte:end } }, _sum:{ amount:true } }),
      ]);
      months.push({
        month: `${d.getMonth()+1}월`,
        amount: Number(sales._sum.totalAmount || 0),
        expense: Number(expenses._sum.amount || 0),
      });
    }
    res.json(months);
  } catch (err) { next(err); }
});

// 기간별 매출 리포트
router.get('/sales', auth, async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const where = {};
    if (from) where.createdAt = { gte: new Date(from) };
    if (to) where.createdAt = { ...where.createdAt, lte: new Date(to) };
    const data = await prisma.sale.findMany({
      where, include:{ customer:true, items:{ include:{ product:true } } }, orderBy:{ createdAt:'desc' }
    });
    const total = data.reduce((s,d) => s + Number(d.totalAmount), 0);
    res.json({ total, count: data.length, data });
  } catch (err) { next(err); }
});

module.exports = router;
