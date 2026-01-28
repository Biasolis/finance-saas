const express = require('express');
const router = express.Router();
const upload = require('../config/upload');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.post('/', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Nenhum arquivo enviado.' });
        }
        
        let fileUrl = '';

        // Verifica qual estratégia foi usada para gerar a URL correta
        if (process.env.STORAGE_TYPE === 's3') {
            // S3 retorna o caminho absoluto (https://bucket...)
            fileUrl = req.file.location;
        } else {
            // Local retorna o caminho relativo
            fileUrl = `/uploads/${req.file.filename}`;
        }
        
        return res.json({ 
            filename: req.file.key || req.file.filename,
            url: fileUrl 
        });

    } catch (error) {
        console.error('Erro no upload:', error);
        return res.status(500).json({ message: 'Erro ao processar arquivo.' });
    }
});

module.exports = router;