
'use server';

import nodemailer from 'nodemailer';
import { type User, type HolidayRequest } from './types';
import { format } from 'date-fns';


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

type SendHolidayRequestUpdateEmailParams = {
    request: HolidayRequest;
    user: User;
    approver: User;
    teamLead: User | null;
    status: 'Approved' | 'Rejected';
}

export async function sendHolidayRequestUpdateEmail({ request, user, approver, teamLead, status }: SendHolidayRequestUpdateEmailParams) {
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

    const recipients = new Set<string>();
    recipients.add(user.email);
    if (teamLead?.email) {
        recipients.add(teamLead.email);
    }
    // Also notify the approver if they are a super admin and not the team lead
    if (approver.role === 'Super Admin' && approver.email !== teamLead?.email) {
        recipients.add(approver.email);
    }

    const mailOptions = {
        from: process.env.SMTP_FROM,
        to: Array.from(recipients).join(','),
        subject: `Holiday Request ${status}`,
        html: `
            <h1>Holiday Request ${status}</h1>
            <p>Hello,</p>
            <p>This is to inform you that the holiday request for <b>${user.name}</b> from ${format(new Date(request.startDate), 'PP')} to ${format(new Date(request.endDate), 'PP')} has been <b>${status.toLowerCase()}</b> by ${approver.name}.</p>
            <p>Thanks,</p>
            <p>The TimeTool Team</p>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Holiday request ${status.toLowerCase()} email sent to:`, Array.from(recipients).join(','));
        return { success: true };
    } catch (error) {
        console.error('Failed to send holiday request update email:', error);
        throw new Error('Failed to send email.');
    }
}
