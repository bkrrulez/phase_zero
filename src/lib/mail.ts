
'use server';

import nodemailer from 'nodemailer';

const smtpConfig = {
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: Number(process.env.SMTP_PORT) === 465, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
};

const transporter = nodemailer.createTransport(smtpConfig);

type SendPasswordChangeEmailParams = {
  to: string;
  name: string;
};

export async function sendPasswordChangeEmail({ to, name }: SendPasswordChangeEmailParams) {
  const mailOptions = {
    from: process.env.SMTP_FROM,
    to: to,
    subject: 'Your Password has been changed',
    html: `
      <h1>Password Changed</h1>
      <p>Hello ${name},</p>
      <p>This is a confirmation that the password for your account has just been changed.</p>
      <p>If you did not make this change, please contact your administrator immediately.</p>
      <p>Thanks,</p>
      <p>The TimeWise Teams Team</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Password change email sent to:', to);
    return { success: true };
  } catch (error) {
    console.error('Failed to send password change email:', error);
    // In a real app, you might want more robust error handling
    throw new Error('Failed to send email.');
  }
}
