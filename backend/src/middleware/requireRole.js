function requireRole(...roles) {
  return function (req, res, next) {
    const userRole = req.user?.role;
    if (!userRole || !roles.includes(userRole)) {
      return res.status(403).json({ ok: false, error: 'Forbidden' });
    }
    return next();
  };
}

module.exports = { requireRole };

