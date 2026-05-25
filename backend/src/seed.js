// 창고 3개 생성
await prisma.warehouse.upsert({ where:{id:1}, update:{}, create:{ name:'Johannesburg Warehouse', location:'Gauteng Province', manager:'담당자1' }});
await prisma.warehouse.upsert({ where:{id:2}, update:{}, create:{ name:'Pretoria Warehouse',     location:'Tshwane Metro',   manager:'담당자2' }});
await prisma.warehouse.upsert({ where:{id:3}, update:{}, create:{ name:'Cape Town Warehouse',    location:'Western Cape',    manager:'담당자3' }});