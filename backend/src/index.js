const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const authRoutes      = require('./routes/auth');
const userRoutes      = require('./routes/users');
const branchRoutes    = require('./routes/branches');
const customerRoutes  = require('./routes/customers');
const supplierRoutes  = require('./routes/suppliers');
const productRoutes   = require('./routes/products');
const categoryRoutes  = require('./routes/categories');
const inventoryRoutes = require('./routes/inventory');
const saleRoutes      = require('./routes/sales');
const purchaseRoutes  = require('./routes/purchases');
const accountingRoutes = require('./routes/accounting');
const reportRoutes    = require('./routes/reports');
const settingRoutes   = require('./routes/settings');
const pdfRoutes       = require('./routes/pdf');
const quotationRoutes = require('./routes/quotations');
const emailRoutes     = require('./routes/email');
const currencyRoutes  = require('./routes/currency');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

app.use('/api/auth',       authRoutes);
app.use('/api/users',      userRoutes);
app.use('/api/branches',   branchRoutes);
app.use('/api/customers',  customerRoutes);
app.use('/api/suppliers',  supplierRoutes);
app.use('/api/products',   productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/inventory',  inventoryRoutes);
app.use('/api/sales',      saleRoutes);
app.use('/api/purchases',  purchaseRoutes);
app.use('/api/accounting', accountingRoutes);
app.use('/api/reports',    reportRoutes);
app.use('/api/settings',   settingRoutes);
app.use('/api/pdf',        pdfRoutes);
app.use('/api/quotations', quotationRoutes);
app.use('/api/email',      emailRoutes);
app.use('/api/currency',   currencyRoutes);

app.get('/api/health', (req, res) => res.json({ status:'ok' }));
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`✅ 백엔드 서버 실행 중: http://localhost:${PORT}`));
