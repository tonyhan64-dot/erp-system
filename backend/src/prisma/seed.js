const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  // ── Roles ──────────────────────────────────
  const superAdmin  = await prisma.role.upsert({ where:{name:'Super Admin'},  update:{}, create:{name:'Super Admin',  description:'Full system access'} });
  const branchMgr   = await prisma.role.upsert({ where:{name:'Branch Manager'}, update:{}, create:{name:'Branch Manager', description:'Branch level access'} });
  const branchStaff = await prisma.role.upsert({ where:{name:'Branch Staff'},  update:{}, create:{name:'Branch Staff',  description:'Basic branch operations'} });

  // ── Branches ───────────────────────────────
  const hq = await prisma.branch.upsert({ where:{name:'Head Office'}, update:{}, create:{ name:'Head Office', address:'Johannesburg, Gauteng', phone:'011-000-0001', email:'hq@amiparts.co.za', manager:'Super Admin' } });
  const b1 = await prisma.branch.upsert({ where:{name:'Branch 1'},    update:{}, create:{ name:'Branch 1',    address:'Pretoria, Tshwane',       phone:'012-000-0001', email:'branch1@amiparts.co.za', manager:'Branch Manager 1' } });
  const b2 = await prisma.branch.upsert({ where:{name:'Branch 2'},    update:{}, create:{ name:'Branch 2',    address:'Cape Town, Western Cape',  phone:'021-000-0001', email:'branch2@amiparts.co.za', manager:'Branch Manager 2' } });

  // ── Users ──────────────────────────────────
  const pw = await bcrypt.hash('admin1234', 10);
  await prisma.user.upsert({ where:{email:'admin@erp.com'},   update:{}, create:{ email:'admin@erp.com',   password:pw, name:'Super Admin',      roleId:superAdmin.id,  branchId:null } });
  await prisma.user.upsert({ where:{email:'branch1@erp.com'}, update:{}, create:{ email:'branch1@erp.com', password:pw, name:'Branch 1 Manager', roleId:branchMgr.id,   branchId:b1.id } });
  await prisma.user.upsert({ where:{email:'branch2@erp.com'}, update:{}, create:{ email:'branch2@erp.com', password:pw, name:'Branch 2 Manager', roleId:branchMgr.id,   branchId:b2.id } });

  // ── Categories (English) ───────────────────
  const cats = ['Filters','Brakes','Ignition','Engine','Cooling','Electrical','Suspension','Exhaust','Transmission','Body Parts'];
  const catMap = {};
  for (const c of cats) {
    const r = await prisma.category.upsert({ where:{name:c}, update:{}, create:{name:c} });
    catMap[c] = r.id;
  }

  // ── Settings ───────────────────────────────
  const settings = [
    { key:'company_name',        value:'AMI ELECTRONICS CC PARTS' },
    { key:'company_reg_no',      value:'1995/029029/23' },
    { key:'company_vat_no',      value:'4510151923' },
    { key:'company_address',     value:'Cnr Nut Ave & Industry Rd, Clayville Industrial, Olifantsfontein 1666' },
    { key:'company_zip',         value:'2128' },
    { key:'company_tel',         value:'010 900 3321' },
    { key:'company_whatsapp',    value:'+27639728095' },
    { key:'company_email',       value:'pmtembisa@gmail.com' },
    { key:'company_website',     value:'www.amiparts.co.za' },
    { key:'currency',            value:'ZAR' },
    { key:'vat_rate',            value:'15' },
    { key:'a_markup',            value:'10' },
    { key:'b_markup',            value:'35' },
    { key:'date_format',         value:'yyyy-MM-dd' },
    { key:'print_paper_size',    value:'A4' },
    { key:'print_font_family',   value:'Helvetica' },
    { key:'print_font_size',     value:'10' },
    { key:'print_primary_color', value:'#185FA5' },
    { key:'print_footer_text',   value:'Thank you for your business!' },
    { key:'print_default_printer', value:'pdf' },
    { key:'default_valid_days',  value:'15' },
    { key:'bank_name',           value:'FIRST NATIONAL BANK' },
    { key:'bank_account_name',   value:'AMI ELECTRONICS CC PARTS-MALL TEMBISA' },
    { key:'bank_account_no',     value:'62808558483' },
    { key:'bank_branch',         value:'RIVONIA' },
    { key:'email_service',       value:'gmail' },
    { key:'email_user',          value:'' },
    { key:'email_pass',          value:'' },
    { key:'terms_of_sale',       value:'1. Any electrical goods return is not accepted and do not carry any guarantees.\n2. No goods will be accepted for exchange/refund after 7 days.\n3. Damaged / Used parts will not be accepted for returns. 20% handling fee will be charged on goods correctly supplied.\n4. No returns accepted if there is: No invoice / Special orders / No original packaging.\n5. Card payment can only be refunded back by card or EFT. No cash refunds.' },
  ];
  for (const s of settings) {
    await prisma.setting.upsert({ where:{key:s.key}, update:{value:s.value}, create:s });
  }

  // ── Sample Products ────────────────────────
  const products = [
    { partNo:'OF-001', brand:'Bosch',  name:'Engine Oil Filter',    categoryId:catMap['Filters'], cost:85,  aPrice:107.53, bPrice:131.73, cPrice:151.49, minStock:20, carBrand:'Toyota', carModel:'Hilux', carYear:'2015-2023' },
    { partNo:'BP-F01', brand:'Brembo', name:'Brake Pad Front Set',  categoryId:catMap['Brakes'],  cost:320, aPrice:404.80, bPrice:495.60, cPrice:570.44, minStock:10, carBrand:'Toyota', carModel:'Hilux', carYear:'2016-2023' },
    { partNo:'SP-001', brand:'NGK',    name:'Spark Plug Set',       categoryId:catMap['Ignition'],cost:180, aPrice:227.70, bPrice:278.85, cPrice:320.68, minStock:15, carBrand:'Ford',   carModel:'Ranger',carYear:'2012-2022' },
    { partNo:'AF-002', brand:'Mann',   name:'Air Filter',           categoryId:catMap['Filters'], cost:65,  aPrice:82.23,  bPrice:100.74, cPrice:115.85, minStock:10, carBrand:'VW',     carModel:'Golf',  carYear:'2013-2021' },
    { partNo:'TB-001', brand:'Gates',  name:'Timing Belt',          categoryId:catMap['Engine'],  cost:480, aPrice:607.20, bPrice:743.40, cPrice:854.91, minStock:5,  carBrand:'Hyundai',carModel:'Tucson',carYear:'2010-2020' },
  ];

  for (const p of products) {
    const prod = await prisma.product.upsert({ where:{partNo:p.partNo}, update:{}, create:p });
    for (const branch of [hq, b1, b2]) {
      await prisma.inventory.upsert({
        where:{ productId_branchId:{ productId:prod.id, branchId:branch.id } },
        update:{},
        create:{ productId:prod.id, branchId:branch.id, quantity:Math.floor(Math.random()*40)+5, location:branch.id===hq.id?`A${prod.id}-01`:`S${branch.id}-0${prod.id}` },
      });
    }
  }

  // ── Sample Customers ───────────────────────
  await prisma.customer.upsert({ where:{id:1}, update:{}, create:{ name:'ABC Motors',   contact:'John Smith',  phone:'011-111-1111', email:'abc@motors.co.za',   branchId:hq.id, grade:'A' } });
  await prisma.customer.upsert({ where:{id:2}, update:{}, create:{ name:'XYZ Garage',   contact:'Peter Jones', phone:'012-222-2222', email:'xyz@garage.co.za',   branchId:b1.id, grade:'B' } });
  await prisma.customer.upsert({ where:{id:3}, update:{}, create:{ name:'Fast Parts CC', contact:'Mike Brown',  phone:'021-333-3333', email:'fast@parts.co.za',   branchId:b2.id, grade:'C' } });

  // ── Sample Supplier ────────────────────────
  await prisma.supplier.upsert({ where:{id:1}, update:{}, create:{ name:'Parts Korea HQ', contact:'David Lee', phone:'011-444-4444', email:'hq@partskorea.co.za', paymentTerms:'30 Days' } });

  console.log('✅ AMIPARTS ERP — Initial data loaded successfully!');
  console.log('');
  console.log('Login Accounts:');
  console.log('  Super Admin : admin@erp.com    / admin1234');
  console.log('  Branch 1    : branch1@erp.com  / admin1234');
  console.log('  Branch 2    : branch2@erp.com  / admin1234');
}

main().catch(console.error).finally(() => prisma.$disconnect());
