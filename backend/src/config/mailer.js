const nodemailer = require('nodemailer');
require('dotenv').config();

let transporter;

const setupMailer = async () => {
    if (process.env.SMTP_HOST) {
        // Produção (SendGrid, AWS SES, Gmail, etc)
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: false, // true para 465, false para outras
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    } else {
        // Desenvolvimento (Ethereal Mail - Fake)
        const testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
            host: "smtp.ethereal.email",
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass,
            },
        });
        console.log('📧 Ethereal Mail Configurado (Dev Mode)');
    }
};

setupMailer();

const sendMail = async (to, subject, html) => {
    if (!transporter) await setupMailer();

    const info = await transporter.sendMail({
        from: '"Finance SaaS" <no-reply@financesaas.com>',
        to,
        subject,
        html,
    });

    // Se estiver usando Ethereal, mostra o link no console
    if (nodemailer.getTestMessageUrl(info)) {
        console.log('📨 Preview URL (Clique para ver o email):', nodemailer.getTestMessageUrl(info));
    }

    return info;
};

module.exports = { sendMail };