const router = require('express').Router();
const auth = require('../middleware/auth');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 이메일 전송 함수
const createTransporter = (emailConfig) => {
  return nodemailer.createTransport({
    service: emailConfig.service || 'gmail',
    auth: {
      user: emailConfig.user,
      pass: emailConfig.pass,
    },
  });
};

const fmt = (n) => `R ${Number(n||0).toLocaleString('en-ZA', { minimumFractionDigits:2, maximumFractionDigits:2 })}`;
const fmtDate = (d) => new Date(d).toLocaleDateString('ko-KR');

// PDF 버퍼 생성
const generateInvoicePDF = (sale, cfg) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin:50, size:'A4' });
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(20).font('Helvetica-Bold').text('INVOICE', 50, 45);
    doc.fontSize(10).font('Helvetica').fillColor('#666').text(`${cfg.company_name || 'ERP System'}`, 50, 70);
    doc.moveTo(50,90).lineTo(550,90).strokeColor('#185FA5').lineWidth(2).stroke();

    doc.fontSize(14).font('Helvetica-Bold').fillColor('#000').text(`Invoice No: ${sale.saleNo}`, 50, 105);
    doc.fontSize(9).font('Helvetica').fillColor('#333')
      .text(`Date: ${fmtDate(sale.saleDate)}`, 50, 125)
      .text(`Customer: ${sale.customer.name}`, 50, 139)
      .text(`Status: ${sale.status}`, 50, 153);

    let y = 180;
    doc.rect(50, y-5, 500, 20).fillColor('#E6F1FB').fill();
    doc.fillColor('#0C447C').fontSize(9).font('Helvetica-Bold');
    doc.text('Product', 54, y).text('Qty', 274, y).text('Price', 354, y).text('Subtotal', 454, y);
    y += 22;

    sale.items.forEach(item => {
      doc.fillColor('#333').font('Helvetica').fontSize(9);
      doc.text(item.product.name, 54, y).text(String(item.quantity), 274, y)
         .text(fmt(item.unitPrice), 354, y).text(fmt(item.subtotal), 454, y);
      doc.moveTo(50, y+16).lineTo(550, y+16).strokeColor('#eee').lineWidth(0.5).stroke();
      y += 22;
    });

    const tax = Number(sale.totalAmount) * (Number(cfg.tax_rate||10)/100);
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#185FA5')
      .text(`Subtotal: ${fmt(sale.totalAmount)}`, 350, y+15)
      .text(`VAT(${cfg.tax_rate||10}%): ${fmt(tax)}`, 350, y+30)
      .text(`TOTAL: ${fmt(Number(sale.totalAmount)+tax)}`, 350, y+48);

    doc.fontSize(8).font('Helvetica').fillColor('#999')
      .text('Thank you for your business!', 50, 760, { align:'center', width:500 });
    doc.end();
  });
};

// POST /api/email/invoice/:saleId — 인보이스 이메일 발송
router.post('/invoice/:saleId', auth, async (req, res, next) => {
  try {
    const { toEmail } = req.body;
    if (!toEmail) return res.status(400).json({ error: '수신 이메일을 입력하세요.' });

    const sale = await prisma.sale.findUnique({
      where: { id: Number(req.params.saleId) },
      include: { customer:true, items:{ include:{ product:true } } },
    });
    if (!sale) return res.status(404).json({ error: '판매 내역 없음' });

    const settings = await prisma.setting.findMany();
    const cfg = Object.fromEntries(settings.map(s => [s.key, s.value]));

    if (!cfg.email_user || !cfg.email_pass) {
      return res.status(400).json({ error: '이메일 설정이 필요합니다. Settings 메뉴에서 이메일을 설정해주세요.' });
    }

    const pdfBuffer = await generateInvoicePDF(sale, cfg);
    const transporter = createTransporter({ service: cfg.email_service||'gmail', user: cfg.email_user, pass: cfg.email_pass });

    await transporter.sendMail({
      from: `"${cfg.company_name||'ERP System'}" <${cfg.email_user}>`,
      to: toEmail,
      subject: `Invoice ${sale.saleNo} from ${cfg.company_name||'ERP System'}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#185FA5;padding:20px;border-radius:8px 8px 0 0">
            <h1 style="color:white;margin:0;font-size:24px">Invoice</h1>
          </div>
          <div style="padding:24px;background:#f9fafb;border:1px solid #e5e7eb">
            <p>Dear <strong>${sale.customer.name}</strong>,</p>
            <p>Please find attached your invoice <strong>${sale.saleNo}</strong>.</p>
            <table style="width:100%;border-collapse:collapse;margin:16px 0">
              <tr style="background:#E6F1FB"><th style="padding:8px;text-align:left">Item</th><th style="padding:8px">Qty</th><th style="padding:8px">Amount</th></tr>
              ${sale.items.map(i=>`<tr><td style="padding:8px;border-bottom:1px solid #eee">${i.product.name}</td><td style="padding:8px;text-align:center;border-bottom:1px solid #eee">${i.quantity}</td><td style="padding:8px;text-align:right;border-bottom:1px solid #eee">${fmt(i.subtotal)}</td></tr>`).join('')}
              <tr><td colspan="2" style="padding:8px;text-align:right;font-weight:bold">TOTAL:</td><td style="padding:8px;text-align:right;font-weight:bold;color:#185FA5">${fmt(sale.totalAmount)}</td></tr>
            </table>
            <p style="color:#666;font-size:14px">The PDF invoice is attached to this email.</p>
          </div>
          <div style="padding:16px;text-align:center;color:#999;font-size:12px">
            ${cfg.company_name||'ERP System'} · ${cfg.company_reg_no||''}
          </div>
        </div>`,
      attachments: [{
        filename: `invoice-${sale.saleNo}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      }],
    });

    // 감사 로그
    await prisma.auditLog.create({
      data: { userId: req.user.id, action:'EMAIL_SENT', module:'sales', detail:`Invoice ${sale.saleNo} → ${toEmail}` }
    });

    res.json({ message: `✅ ${toEmail} 로 인보이스가 발송되었습니다.` });
  } catch (err) {
    if (err.code === 'EAUTH') return res.status(400).json({ error: '이메일 인증 실패. Gmail 앱 비밀번호를 확인해주세요.' });
    next(err);
  }
});

// POST /api/email/test — 이메일 연결 테스트
router.post('/test', auth, async (req, res, next) => {
  try {
    const settings = await prisma.setting.findMany();
    const cfg = Object.fromEntries(settings.map(s => [s.key, s.value]));
    if (!cfg.email_user || !cfg.email_pass) return res.status(400).json({ error: '이메일 설정 없음' });
    const transporter = createTransporter({ service: cfg.email_service||'gmail', user: cfg.email_user, pass: cfg.email_pass });
    await transporter.verify();
    res.json({ message: '✅ 이메일 연결 성공!' });
  } catch (err) {
    res.status(400).json({ error: `연결 실패: ${err.message}` });
  }
});

module.exports = router;
