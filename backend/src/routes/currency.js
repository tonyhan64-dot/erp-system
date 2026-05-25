const router = require('express').Router();
const auth = require('../middleware/auth');

// 환율 캐시 (1시간)
let rateCache = { rates: null, updatedAt: null };

const fetchRates = async () => {
  try {
    // 무료 환율 API 사용
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/ZAR');
    const data = await res.json();
    rateCache = { rates: data.rates, updatedAt: new Date() };
    return data.rates;
  } catch {
    // API 실패시 고정 환율 사용
    return { ZAR:1, USD:0.054, KRW:73.2, EUR:0.050, GBP:0.043, CNY:0.39 };
  }
};

// GET /api/currency/rates — 환율 조회
router.get('/rates', auth, async (req, res) => {
  const now = new Date();
  const oneHour = 60 * 60 * 1000;
  if (!rateCache.rates || (now - rateCache.updatedAt) > oneHour) {
    await fetchRates();
  }
  const { ZAR=1, USD=0.054, KRW=73.2, EUR=0.050, GBP=0.043, CNY=0.39 } = rateCache.rates || {};
  res.json({
    base: 'ZAR',
    updatedAt: rateCache.updatedAt,
    rates: { ZAR:1, USD, KRW, EUR, GBP, CNY },
  });
});

// POST /api/currency/convert — 환율 변환
router.post('/convert', auth, async (req, res) => {
  const { amount, from, to } = req.body;
  const now = new Date();
  const oneHour = 60 * 60 * 1000;
  if (!rateCache.rates || (now - rateCache.updatedAt) > oneHour) {
    await fetchRates();
  }
  const rates = rateCache.rates || { ZAR:1, USD:0.054, KRW:73.2 };
  // from → ZAR → to 변환
  const inZAR = amount / (rates[from] || 1);
  const result = inZAR * (rates[to] || 1);
  res.json({ from, to, amount: Number(amount), result: Math.round(result * 100) / 100 });
});

module.exports = router;
