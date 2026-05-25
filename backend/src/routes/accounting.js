const router = require('express').Router();
const auth = require('../middleware/auth');
const { branchFilter } = require('../middleware/branchFilter');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /api/accounting/ledger
router.get('/ledger', auth, branchFilter, async (req, res, next) => {
  try {
    const data = await prisma.ledger.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json(data);
  } catch (err) { next(err); }
});

// GET /api/accounting/payments
router.get('/payments', auth, branchFilter, async (req, res, next) => {
  try {
    const data = await prisma.payment.findMany({
      include: { customer: true, invoice: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json(data);
  } catch (err) { next(err); }
});

// POST /api/accounting/payments
router.post('/payments', auth, async (req, res, next) => {
  try {
    const { date, type, method, amount, customerId, purchaseId, invoiceId } = req.body;
    const payment = await prisma.payment.create({
      data: {
        date: date ? new Date(date) : new Date(),
        type: type || 'Receipt',
        method: method || 'Cash',
        amount: Number(amount),
        ...(customerId && { customerId: Number(customerId) }),
        ...(purchaseId && { purchaseId: Number(purchaseId) }),
        ...(invoiceId && { invoiceId: Number(invoiceId) }),
      },
      include: { customer: true },
    });
    res.status(201).json(payment);
  } catch (err) { next(err); }
});

// GET /api/accounting/expenses
router.get('/expenses', auth, branchFilter, async (req, res, next) => {
  try {
    const data = await prisma.expense.findMany({
      orderBy: { date: 'desc' },
      take: 100,
    });
    res.json(data);
  } catch (err) { next(err); }
});

// POST /api/accounting/expenses
router.post('/expenses', auth, async (req, res, next) => {
  try {
    const expense = await prisma.expense.create({
      data: {
        date: req.body.date ? new Date(req.body.date) : new Date(),
        category: req.body.category,
        description: req.body.description,
        amount: Number(req.body.amount),
      },
    });
    // 장부 기록
    await prisma.ledger.create({
      data: {
        type: 'Expense',
        description: `${req.body.category} - ${req.body.description}`,
        debit: Number(req.body.amount),
        credit: 0,
      },
    });
    res.status(201).json(expense);
  } catch (err) { next(err); }
});

// GET /api/accounting/invoices
router.get('/invoices', auth, branchFilter, async (req, res, next) => {
  try {
    const where = req.isSuperAdmin ? {} : { sale: { branchId: req.userBranchId } };
    const data = await prisma.invoice.findMany({
      where,
      include: { customer: true, sale: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json(data);
  } catch (err) { next(err); }
});

// POST /api/accounting/invoices
router.post('/invoices', auth, async (req, res, next) => {
  try {
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNo: `INV-${Date.now().toString().slice(-8)}`,
        saleId: Number(req.body.saleId),
        customerId: Number(req.body.customerId),
        amount: Number(req.body.amount),
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : new Date(Date.now() + 15*24*60*60*1000),
        status: 'Unpaid',
      },
      include: { customer: true },
    });
    res.status(201).json(invoice);
  } catch (err) { next(err); }
});

// PATCH /api/accounting/invoices/:id/status
router.patch('/invoices/:id/status', auth, async (req, res, next) => {
  try {
    const invoice = await prisma.invoice.update({
      where: { id: Number(req.params.id) },
      data: { status: req.body.status },
    });
    res.json(invoice);
  } catch (err) { next(err); }
});

module.exports = router;
