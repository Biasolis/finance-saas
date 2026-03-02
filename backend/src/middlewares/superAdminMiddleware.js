const superAdminMiddleware = (req, res, next) => {
    // O authMiddleware já rodou antes e populou req.user
    if (!req.user || !req.user.isSuperAdmin) {
        return res.status(403).json({ 
            message: 'Acesso negado. Apenas Super Admins podem realizar esta ação.' 
        });
    }
    next();
};

module.exports = superAdminMiddleware;