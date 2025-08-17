import nodemailer from 'nodemailer';

export async function sendOtpEmail(to: string, code: string) {
  const host = process.env.SMTP_HOST;
  if (!host) { console.log(`[DEV OTP] to=${to} code=${code}`); return; }

  const transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });

  await transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    subject: 'Your login code',
    text: `Your OTP is ${code}. It expires in 10 minutes.`,
    html: `<p>Your OTP is <b>${code}</b>. It expires in 10 minutes.</p>`,
  });
}