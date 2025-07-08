
'use server';

import nodemailer from 'nodemailer';
import { type User } from './types';

type SendPasswordChangeEmailParams = {
  to: string;
  name: string;
};

export async function sendPasswordChangeEmail({ to, name }: SendPasswordChangeEmailParams) {
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
      <p>The TimeTool Team</p>
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

type SendPasswordResetEmailParams = {
    to: string;
    name: string;
};

export async function sendPasswordResetEmail({ to, name }: SendPasswordResetEmailParams) {
    const resetLink = `http://localhost:3000/reset-password?email=${encodeURIComponent(to)}`;

    const smtpConfig = {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
        },
    };

    const transporter = nodemailer.createTransport(smtpConfig);

    const mailOptions = {
        from: process.env.SMTP_FROM,
        to: to,
        subject: 'Your Password Reset Link for TimeTool',
        html: `
            <h1>Password Reset Request</h1>
            <p>Hello ${name},</p>
            <p>We received a request to reset your password for your TimeTool account. Click the link below to set a new password:</p>
            <p><a href="${resetLink}" target="_blank">Reset Your Password</a></p>
            <p>If you did not make this request, you can safely ignore this email.</p>
            <p>Thanks,</p>
            <p>The TimeTool Team</p>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Password reset email sent to:', to);
        return { success: true };
    } catch (error) {
        console.error('Failed to send password reset email:', error);
        throw new Error('Failed to send email.');
    }
}

type SendPasswordResetConfirmationEmailParams = {
    user: User;
    teamLead?: User | null;
}

export async function sendPasswordResetConfirmationEmail({ user, teamLead }: SendPasswordResetConfirmationEmailParams) {
    const smtpConfig = {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
        },
    };
    const transporter = nodemailer.createTransport(smtpConfig);

    const recipients = [user.email];
    if (teamLead?.email) {
        recipients.push(teamLead.email);
    }

    const mailOptions = {
        from: process.env.SMTP_FROM,
        to: recipients.join(','),
        subject: 'Password Reset Successful for TimeTool',
        html: `
            <h1>Password Reset Confirmation</h1>
            <p>Hello,</p>
            <p>This is a confirmation that the password for the account associated with <b>${user.email}</b> has been successfully reset.</p>
            <p>If you did not make this change, please contact your administrator immediately.</p>
            <p>Thanks,</p>
            <p>The TimeTool Team</p>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Password reset confirmation email sent to:', recipients.join(','));
        return { success: true };
    } catch (error) {
        console.error('Failed to send password reset confirmation email:', error);
        throw new Error('Failed to send email.');
    }
}
