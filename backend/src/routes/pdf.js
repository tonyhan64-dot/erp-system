const router = require('express').Router();
const auth = require('../middleware/auth');
const PDFDocument = require('pdfkit');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const fmt = (n) => `R ${Number(n || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (d) => new Date(d).toLocaleDateString('ko-KR');

const pdfHeader = (doc, title, subtitle) => {
  doc.fontSize(20).font('Helvetica-Bold').text('ERP System', 50, 45);
  doc.fontSize(10).font('Helvetica').fillColor('#666').text('Business Management System', 50, 70);
  doc.moveTo(50, 90).lineTo(550, 90).strokeColor('#185FA5').lineWidth(2).stroke();
  doc.fontSize(16).font('Helvetica-Bold').fillColor('#000').text(title, 50, 105);
  if (subtitle) doc.fontSize(10).font('Helvetica').fillColor('#666').text(subtitle, 50, 125);
  doc.moveDown(0.5);
};

const tableRow = (doc, y, cols, widths, isHeader = false) => {
  if (isHeader) {
    doc.rect(50, y - 5, 500, 20).fillColor('#E6F1FB').fill();
    doc.fillColor('#0C447C');
  } else {
    doc.fillColor('#333');
  }
  let x = 50;
  cols.forEach((col, i) => {
    doc.fontSize(9).font(isHeader ? 'Helvetica-Bold' : 'Helvetica').text(String(col), x + 4, y, { width: widths[i] - 8 });
    x += widths[i];
  });
  doc.moveTo(50, y + 16).lineTo(550, y + 16).strokeColor('#ddd').lineWidth(0.5).stroke();
};

// ── 인보이스 PDF ──────────────────────────────
router.get('/invoice/:saleId', auth, async (req, res, next) => {
  try {
    const sale = await prisma.sale.findUnique({
      where: { id: Number(req.params.saleId) },
      include: { customer: true, items: { include: { product: true } } },
    });
    if (!sale) return res.status(404).json({ error: '판매 내역 없음' });

    const settings = await prisma.setting.findMany();
    const cfg = Object.fromEntries(settings.map(s => [s.key, s.value]));

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=invoice-${sale.saleNo}.pdf`);
    doc.pipe(res);

    pdfHeader(doc, 'INVOICE', `Invoice No: ${sale.saleNo}`);

    // 회사 & 고객 정보
    const infoY = 150;
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#000').text('FROM:', 50, infoY);
    doc.font('Helvetica').fillColor('#333')
      .text(cfg.company_name || 'ERP System', 50, infoY + 14)
      .text(`Reg: ${cfg.company_reg_no || '-'}`, 50, infoY + 26);

    doc.fontSize(9).font('Helvetica-Bold').fillColor('#000').text('BILL TO:', 320, infoY);
    doc.font('Helvetica').fillColor('#333')
      .text(sale.customer.name, 320, infoY + 14)
      .text(sale.customer.phone || '', 320, infoY + 26)
      .text(sale.customer.email || '', 320, infoY + 38);

    doc.fontSize(9).font('Helvetica').fillColor('#666')
      .text(`Date: ${fmtDate(sale.saleDate)}`, 320, infoY + 55)
      .text(`Status: ${sale.status}`, 320, infoY + 67);

    // 상품 테이블
    const tableY = infoY + 100;
    const widths = [220, 80, 100, 100];
    tableRow(doc, tableY, ['Product', 'Qty', 'Unit Price', 'Subtotal'], widths, true);

    let y = tableY + 22;
    sale.items.forEach(item => {
      tableRow(doc, y, [item.product.name, item.quantity, fmt(item.unitPrice), fmt(item.subtotal)], widths);
      y += 22;
    });

    // 합계
    const taxRate = Number(cfg.tax_rate || 10) / 100;
    const subtotal = Number(sale.totalAmount);
    const tax = subtotal * taxRate;
    const total = subtotal + tax;

    doc.moveTo(350, y + 5).lineTo(550, y + 5).strokeColor('#185FA5').lineWidth(1).stroke();
    doc.fontSize(9).font('Helvetica').fillColor('#333')
      .text('Subtotal:', 350, y + 12).text(fmt(subtotal), 450, y + 12)
      .text(`VAT (${cfg.tax_rate || 10}%):`, 350, y + 26).text(fmt(tax), 450, y + 26);
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#185FA5')
      .text('TOTAL:', 350, y + 44).text(fmt(total), 450, y + 44);

    // 푸터
    doc.fontSize(8).font('Helvetica').fillColor('#999')
      .text('Thank you for your business!', 50, 760, { align: 'center', width: 500 });

    doc.end();
  } catch (err) { next(err); }
});

// ── 구매 주문서 PDF ──────────────────────────
router.get('/purchase/:purchaseId', auth, async (req, res, next) => {
  try {
    const purchase = await prisma.purchase.findUnique({
      where: { id: Number(req.params.purchaseId) },
      include: { supplier: true, items: { include: { product: true } } },
    });
    if (!purchase) return res.status(404).json({ error: '구매 내역 없음' });

    const settings = await prisma.setting.findMany();
    const cfg = Object.fromEntries(settings.map(s => [s.key, s.value]));

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=purchase-${purchase.purchaseNo}.pdf`);
    doc.pipe(res);

    pdfHeader(doc, 'PURCHASE ORDER', `PO No: ${purchase.purchaseNo}`);

    const infoY = 150;
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#000').text('FROM:', 50, infoY);
    doc.font('Helvetica').fillColor('#333').text(cfg.company_name || 'ERP System', 50, infoY + 14);

    doc.fontSize(9).font('Helvetica-Bold').fillColor('#000').text('SUPPLIER:', 320, infoY);
    doc.font('Helvetica').fillColor('#333')
      .text(purchase.supplier.name, 320, infoY + 14)
      .text(purchase.supplier.phone || '', 320, infoY + 26)
      .text(`Payment: ${purchase.supplier.paymentTerms}`, 320, infoY + 38);

    doc.fontSize(9).font('Helvetica').fillColor('#666')
      .text(`Date: ${fmtDate(purchase.purchaseDate)}`, 320, infoY + 55)
      .text(`Status: ${purchase.status}`, 320, infoY + 67);

    const tableY = infoY + 100;
    const widths = [220, 80, 100, 100];
    tableRow(doc, tableY, ['Product', 'Qty', 'Unit Price', 'Subtotal'], widths, true);

    let y = tableY + 22;
    purchase.items.forEach(item => {
      tableRow(doc, y, [item.product.name, item.quantity, fmt(item.unitPrice), fmt(item.subtotal)], widths);
      y += 22;
    });

    doc.moveTo(350, y + 5).lineTo(550, y + 5).strokeColor('#0F6E56').lineWidth(1).stroke();
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#0F6E56')
      .text('TOTAL:', 350, y + 15).text(fmt(purchase.totalAmount), 450, y + 15);

    doc.fontSize(8).font('Helvetica').fillColor('#999')
      .text('Authorized Purchase Order', 50, 760, { align: 'center', width: 500 });

    doc.end();
  } catch (err) { next(err); }
});

// ── 재고 현황 PDF ────────────────────────────
router.get('/inventory', auth, async (req, res, next) => {
  try {
    const { warehouseId } = req.query;
    const where = warehouseId ? { warehouseId: Number(warehouseId) } : {};
    const inventory = await prisma.inventory.findMany({
      where,
      include: { product: { include: { category: true } }, warehouse: true },
      orderBy: { product: { name: 'asc' } },
    });
    const warehouses = await prisma.warehouse.findMany({ where: { isActive: true } });
    const whName = warehouseId ? warehouses.find(w => w.id === Number(warehouseId))?.name : '전체 창고';

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=inventory-${Date.now()}.pdf`);
    doc.pipe(res);

    pdfHeader(doc, 'INVENTORY REPORT', `${whName} · ${fmtDate(new Date())}`);

    const low = inventory.filter(i => i.quantity <= i.product.minStock && i.quantity > 0).length;
    const out = inventory.filter(i => i.quantity === 0).length;
    const infoY = 145;
    doc.fontSize(9).font('Helvetica').fillColor('#333')
      .text(`Total Items: ${inventory.length}`, 50, infoY)
      .text(`Low Stock: ${low}`, 180, infoY)
      .text(`Out of Stock: ${out}`, 310, infoY);

    const widths = [180, 100, 70, 70, 80];
    let y = infoY + 28;
    tableRow(doc, y, ['Product', 'Warehouse', 'Qty', 'Min', 'Status'], widths, true);
    y += 22;

    inventory.forEach(i => {
      const status = i.quantity === 0 ? 'OUT' : i.quantity <= i.product.minStock ? 'LOW' : 'OK';
      if (y > 740) { doc.addPage(); y = 50; tableRow(doc, y, ['Product', 'Warehouse', 'Qty', 'Min', 'Status'], widths, true); y += 22; }
      tableRow(doc, y, [i.product.name, i.warehouse.name.replace(' Warehouse',''), i.quantity, i.product.minStock, status], widths);
      y += 22;
    });

    doc.end();
  } catch (err) { next(err); }
});

// ── 매출 리포트 PDF ──────────────────────────
router.get('/sales-report', auth, async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const where = {};
    if (from) where.createdAt = { gte: new Date(from) };
    if (to) where.createdAt = { ...where.createdAt, lte: new Date(to) };

    const sales = await prisma.sale.findMany({
      where,
      include: { customer: true, items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const total = sales.reduce((s, d) => s + Number(d.totalAmount), 0);
    const completed = sales.filter(s => s.status === '완료').length;

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=sales-report-${Date.now()}.pdf`);
    doc.pipe(res);

    const period = from && to ? `${fmtDate(from)} ~ ${fmtDate(to)}` : '전체 기간';
    pdfHeader(doc, 'SALES REPORT', period);

    const infoY = 145;
    doc.rect(50, infoY, 150, 50).fillColor('#E6F1FB').fill();
    doc.rect(210, infoY, 150, 50).fillColor('#EAF3DE').fill();
    doc.rect(370, infoY, 150, 50).fillColor('#FAEEDA').fill();

    doc.fontSize(8).font('Helvetica').fillColor('#0C447C').text('TOTAL SALES', 58, infoY + 8);
    doc.fontSize(13).font('Helvetica-Bold').fillColor('#185FA5').text(fmt(total), 58, infoY + 22);

    doc.fontSize(8).font('Helvetica').fillColor('#3B6D11').text('TRANSACTIONS', 218, infoY + 8);
    doc.fontSize(13).font('Helvetica-Bold').fillColor('#1D9E75').text(`${sales.length} 건`, 218, infoY + 22);

    doc.fontSize(8).font('Helvetica').fillColor('#633806').text('COMPLETED', 378, infoY + 8);
    doc.fontSize(13).font('Helvetica-Bold').fillColor('#854F0B').text(`${completed} 건`, 378, infoY + 22);

    const widths = [100, 160, 100, 80, 60];
    let y = infoY + 70;
    tableRow(doc, y, ['Sale No', 'Customer', 'Date', 'Amount', 'Status'], widths, true);
    y += 22;

    sales.forEach(s => {
      if (y > 740) { doc.addPage(); y = 50; tableRow(doc, y, ['Sale No', 'Customer', 'Date', 'Amount', 'Status'], widths, true); y += 22; }
      tableRow(doc, y, [s.saleNo, s.customer.name, fmtDate(s.saleDate), fmt(s.totalAmount), s.status], widths);
      y += 22;
    });

    doc.moveTo(50, y + 10).lineTo(550, y + 10).strokeColor('#185FA5').lineWidth(1).stroke();
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#185FA5').text(`TOTAL: ${fmt(total)}`, 400, y + 18);

    doc.end();
  } catch (err) { next(err); }
});
// ── 이 내용을 backend/src/routes/pdf.js 에서
// module.exports = router; 바로 위에 붙여넣으세요 ──

// 설정값 로드 헬퍼
const getSettings = async () => {
  const rows = await prisma.setting.findMany();
  return Object.fromEntries(rows.map(r => [r.key, r.value]));
};

// 공통 PDF 헤더 생성 (설정값 적용)
const buildHeader = (doc, cfg, title, subTitle) => {
  const color = cfg.print_primary_color || '#185FA5';
  const font = cfg.print_font_family || 'Helvetica';
  const fontSize = Number(cfg.print_font_size || 10);
  const companyName = cfg.print_company_name || cfg.company_name || 'Auto Parts ERP';

  // 상단 색상 바
  doc.rect(0, 0, 595, 80).fill(color);
  doc.fontSize(22).font(font+'-Bold').fillColor('white').text(title, 40, 20);
  doc.fontSize(fontSize).font(font).fillColor('rgba(255,255,255,0.85)').text(companyName, 40, 46);
  if (subTitle) doc.text(subTitle, 40, 58);

  // 회사 주소/연락처
  if (cfg.print_company_address || cfg.print_company_phone) {
    doc.fontSize(fontSize-1).fillColor('rgba(255,255,255,0.7)')
      .text([cfg.print_company_address, cfg.print_company_phone, cfg.print_company_email].filter(Boolean).join(' · '), 40, 70, { width: 500 });
  }

  doc.fillColor('#000');
  return { font, fontSize, color };
};

// ── 견적서 PDF (설정값 적용) ──────────────────────
router.get('/quotation/:id', auth, async (req, res, next) => {
  try {
    const q = await prisma.quotation.findUnique({
      where: { id: Number(req.params.id) },
      include: { customer: true, branch: true, items: { include: { product: true } } },
    });
    if (!q) return res.status(404).json({ error: '견적서 없음' });

    const cfg = await getSettings();
    const isPOS = (cfg.print_paper_size||'A4').includes('mm');
    const paperSize = isPOS ? [226, 800] : (cfg.print_paper_size === 'A5' ? 'A5' : cfg.print_paper_size === 'Letter' ? 'Letter' : 'A4');

    const doc = new PDFDocument({ margin: isPOS ? 10 : 40, size: paperSize });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=quotation-${q.quoteNo}.pdf`);
    doc.pipe(res);

    const vatRate = Number(cfg.vat_rate || 15);
    const subtotal = Number(q.totalAmount);
    const vat = subtotal * vatRate / 100;
    const total = subtotal + vat;
    const fmtR = n => 'R ' + Number(n||0).toFixed(2);

    if (isPOS) {
      // ── POS 영수증 형식 ──
      const color = cfg.print_primary_color || '#185FA5';
      const font = cfg.print_font_family || 'Helvetica';
      const fs = Number(cfg.print_font_size || 9);
      const w = Number((cfg.print_paper_size||'80mm').replace('mm','')) * 2.835;

      doc.fontSize(fs+3).font(font+'-Bold').fillColor(color).text(cfg.print_company_name||'Auto Parts ERP', {align:'center'});
      doc.fontSize(fs).font(font).fillColor('#333')
        .text(cfg.print_company_address||'', {align:'center'})
        .text(cfg.print_company_phone||'', {align:'center'});
      doc.moveDown(0.3);
      doc.moveTo(10, doc.y).lineTo(w-10, doc.y).dash(2,{space:2}).stroke('#999').undash();
      doc.moveDown(0.3);
      doc.font(font+'-Bold').fontSize(fs+1).fillColor(color).text('QUOTATION', {align:'center'});
      doc.font(font).fontSize(fs).fillColor('#333')
        .text(`No: ${q.quoteNo}`, {align:'center'})
        .text(`Date: ${new Date(q.createdAt).toLocaleDateString()}`, {align:'center'})
        .text(`Valid: ${q.expiresAt ? new Date(q.expiresAt).toLocaleDateString() : '-'}`, {align:'center'});
      if (q.customer) doc.text(`Customer: ${q.customer.name}`, {align:'center'});
      doc.moveDown(0.3);
      doc.moveTo(10, doc.y).lineTo(w-10, doc.y).dash(2,{space:2}).stroke('#999').undash();
      doc.moveDown(0.3);

      q.items.forEach(item => {
        doc.font(font+'-Bold').fontSize(fs).fillColor('#000').text(item.product.partNo + ' ' + item.product.name.substring(0,18));
        doc.font(font).fillColor('#333').text(`  ${item.quantity} x ${fmtR(item.unitPrice)}`, {continued:true}).fillColor(color).text(`  ${fmtR(item.subtotal)}`, {align:'right'});
      });

      doc.moveDown(0.3);
      doc.moveTo(10, doc.y).lineTo(w-10, doc.y).dash(2,{space:2}).stroke('#999').undash();
      doc.moveDown(0.3);
      doc.font(font).fontSize(fs).fillColor('#333').text(`Subtotal: ${fmtR(subtotal)}`, {align:'right'});
      doc.text(`VAT (${vatRate}%): ${fmtR(vat)}`, {align:'right'});
      doc.font(font+'-Bold').fontSize(fs+2).fillColor(color).text(`TOTAL: ${fmtR(total)}`, {align:'right'});
      doc.moveDown(0.5);
      doc.font(font).fontSize(fs-1).fillColor('#999').text(cfg.print_footer_text||'Thank you for your business!', {align:'center'});

    } else {
      // ── A4/A5/Letter 형식 ──
      const { font, fontSize, color } = buildHeader(doc, cfg, 'QUOTATION', `Quote No: ${q.quoteNo}`);

      const infoY = 100;
      doc.fontSize(fontSize).font(font).fillColor('#333')
        .text(`Date: ${new Date(q.createdAt).toLocaleDateString()}`, 40, infoY)
        .text(`Valid Until: ${q.expiresAt ? new Date(q.expiresAt).toLocaleDateString() : '-'}`, 40, infoY+14)
        .text(`Branch: ${q.branch?.name||'-'}`, 40, infoY+28);

      if (q.customer) {
        doc.font(font+'-Bold').fillColor('#000').text('QUOTE TO:', 350, infoY);
        doc.font(font).fillColor('#333')
          .text(q.customer.name, 350, infoY+14)
          .text(q.customer.phone||'', 350, infoY+28)
          .text(q.customer.email||'', 350, infoY+42);
      }

      const widths = [80, 220, 50, 80, 70];
      const headers = ['Part No','Description','Qty','Unit Price','Subtotal'];
      let tableY = infoY + 70;

      doc.rect(40, tableY-4, 515, 18).fill(color);
      doc.fillColor('white').fontSize(fontSize-1).font(font+'-Bold');
      let x = 40;
      headers.forEach((h,i) => { doc.text(h, x+3, tableY, {width:widths[i]-6}); x+=widths[i]; });

      let y = tableY + 20;
      q.items.forEach((item,idx) => {
        if (idx%2===1) doc.rect(40, y-3, 515, 18).fill('#f8f9fa');
        doc.fillColor('#333').font(font).fontSize(fontSize-1);
        let x = 40;
        [item.product.partNo, item.product.name, String(item.quantity), fmtR(item.unitPrice), fmtR(item.subtotal)].forEach((v,i)=>{
          doc.text(v, x+3, y, {width:widths[i]-6});
          x += widths[i];
        });
        doc.moveTo(40, y+14).lineTo(555, y+14).strokeColor('#eee').lineWidth(0.3).stroke();
        y += 18;
      });

      doc.moveTo(350, y+8).lineTo(555, y+8).strokeColor(color).lineWidth(1).stroke();
      doc.fontSize(fontSize-1).font(font).fillColor('#333')
        .text('Subtotal:', 350, y+14).text(fmtR(subtotal), 460, y+14)
        .text(`VAT (${vatRate}%):`, 350, y+28).text(fmtR(vat), 460, y+28);
      doc.fontSize(fontSize+1).font(font+'-Bold').fillColor(color)
        .text('TOTAL:', 350, y+46).text(fmtR(total), 460, y+46);

      if (q.notes) {
        doc.fontSize(fontSize-1).font(font).fillColor('#666').text('Notes: '+q.notes, 40, y+14);
      }

      const footerY = 760;
      doc.moveTo(40, footerY).lineTo(555, footerY).strokeColor('#eee').lineWidth(0.5).stroke();
      doc.fontSize(fontSize-2).font(font).fillColor('#999')
        .text(cfg.print_footer_text||'Thank you for your business!', 40, footerY+8, {align:'center', width:515});
    }

    doc.end();
  } catch (err) { next(err); }
});

module.exports = router;
