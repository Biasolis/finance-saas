const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { S3Client } = require('@aws-sdk/client-s3');
const multerS3 = require('multer-s3');
require('dotenv').config();

// Definição da pasta local (para SMB/SFTP/Local)
const uploadDir = path.resolve(__dirname, '..', '..', 'uploads');

// Tipos de arquivos permitidos
const fileFilter = (req, file, cb) => {
    const allowedMimes = [
        'image/jpeg',
        'image/pjpeg',
        'image/png',
        'image/webp',
        'application/pdf'
    ];
    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Tipo de arquivo inválido. Apenas imagens e PDF."));
    }
};

// 1. Configuração STORAGE LOCAL (SMB/NFS/SFTP montados)
const storageLocal = multer.diskStorage({
    destination: (req, file, cb) => {
        // Garante que a pasta existe apenas se for usar local
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `${uniqueSuffix}${ext}`);
    }
});

// 2. Configuração STORAGE S3 (AWS, MinIO, DO Spaces)
let storageS3 = null;
if (process.env.STORAGE_TYPE === 's3') {
    const s3 = new S3Client({
        region: process.env.AWS_REGION,
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
    });

    storageS3 = multerS3({
        s3: s3,
        bucket: process.env.AWS_BUCKET_NAME,
        contentType: multerS3.AUTO_CONTENT_TYPE,
        acl: 'public-read', // Atenção: Verifique as permissões do seu bucket
        key: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const ext = path.extname(file.originalname);
            cb(null, `comprovantes/${uniqueSuffix}${ext}`);
        }
    });
}

// Seleção da estratégia baseada no .env
const uploadConfig = {
    directory: uploadDir,
    storage: process.env.STORAGE_TYPE === 's3' ? storageS3 : storageLocal,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: fileFilter
};

module.exports = multer(uploadConfig);