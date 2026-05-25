const router = require('express').Router();
const auth = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

router.get('/', auth, async (req, res, next) => {
  try {
    const rows = await prisma.setting.findMany();
    const settings = Object.fromEntries(rows.map(r => [r.key, r.value]));
    res.json(settings);
  } catch (err) { next(err); }
});

router.put('/', auth, async (req, res, next) => {
  try {
    const updates = Object.entries(req.body).map(([key, value]) =>
      prisma.setting.upsert({ where: { key }, update: { value: String(value) }, create: { key, value: String(value) } })
    );
    await Promise.all(updates);
    res.json({ message: '저장되었습니다.' });
  } catch (err) { next(err); }
});

module.exports = router;
