// 지점 필터 미들웨어
// Super Admin → 전체 접근
// Branch Manager/Staff → 자기 지점만

const branchFilter = (req, res, next) => {
  const role = req.user?.role;
  const branchId = req.user?.branchId;

  if (role === 'Super Admin') {
    req.branchFilter = {};
    req.isSuperAdmin = true;
  } else {
    if (!branchId) return res.status(403).json({ error: '지점이 배정되지 않은 계정입니다.' });
    req.branchFilter = { branchId };
    req.isSuperAdmin = false;
    req.userBranchId = branchId;
  }
  next();
};

// Super Admin 전용 라우트
const superAdminOnly = (req, res, next) => {
  if (req.user?.role !== 'Super Admin')
    return res.status(403).json({ error: 'Super Admin 권한이 필요합니다.' });
  next();
};

module.exports = { branchFilter, superAdminOnly };
