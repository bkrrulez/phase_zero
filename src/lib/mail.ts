
'use server';

import nodemailer from 'nodemailer';
import { type User, type HolidayRequest, type ContractEndNotification } from './types';
import { format } from 'date-fns';

const createTransporter = () => {
    const smtpConfig = {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
        },
    };
    return nodemailer.createTransport(smtpConfig);
};

export async function sendPasswordResetEmail({ to, name }: { to: string; name: string;}) {
    const domain = process.env.DOMAIN ? `https://${process.env.DOMAIN}` : 'http://localhost:3000';
    const resetLink = `${domain}/reset-password?email=${encodeURIComponent(to)}`;

    const transporter = createTransporter();

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
    const transporter = createTransporter();

    const recipients = new Set<string>();
    recipients.add(user.email);
    if (teamLead?.email) {
        recipients.add(teamLead.email);
    }
    
    const mailOptions = {
        from: process.env.SMTP_FROM,
        to: Array.from(recipients).join(','),
        subject: 'Password Reset Successful for TimeTool',
        html: `
            <h1>Password Reset Confirmation</h1>
            <p>Hello,</p>
            <p>This is a confirmation that the password for the account associated with <b>${user.email}</b> has been successfully reset.</p>
            <p>If you did not authorize this change, please contact your administrator immediately.</p>
            <p>Thanks,</p>
            <p>The TimeTool Team</p>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Password reset confirmation email sent to:', Array.from(recipients).join(','));
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
    const transporter = createTransporter();

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

export async function sendContractEndNotifications(
    expiringContractsDetails: { user: User; daysUntilExpiry: number; rule: ContractEndNotification }[],
    allUsers: User[]
) {
    const transporter = createTransporter();

    // Group users by rule to send one summary email per rule's recipient list
    const notificationsByRule = expiringContractsDetails.reduce((acc, detail) => {
        const recipientUserEmails = detail.rule.recipientUserIds
            .map(id => allUsers.find(u => u.id === id)?.email)
            .filter(Boolean) as string[];

        const recipients = [
            ...detail.rule.recipientEmails,
            ...recipientUserEmails
        ];
        const uniqueRecipients = Array.from(new Set(recipients));

        const key = `${detail.rule.id}-${uniqueRecipients.join(',')}`;

        if (!acc[key]) {
            acc[key] = {
                recipients: uniqueRecipients,
                expiringUsers: [],
            };
        }
        acc[key].expiringUsers.push(detail);
        return acc;
    }, {} as Record<string, { recipients: string[], expiringUsers: typeof expiringContractsDetails }>);


    // Send summary emails to recipients
    for (const key in notificationsByRule) {
        const { recipients, expiringUsers } = notificationsByRule[key];
        if (recipients.length === 0) continue;

        const userListHtml = expiringUsers
            .map(u => `<li>${u.user.name} (${u.user.email}) - Contract ends on ${format(new Date(u.user.contract.endDate!), 'PP')} (${u.daysUntilExpiry} days)</li>`)
            .join('');

        const mailOptions = {
            from: process.env.SMTP_FROM,
            to: recipients.join(','),
            subject: 'Contract Expiry Notification',
            html: `
                <h1>Upcoming Contract Expiries</h1>
                <p>The following users have contracts ending soon:</p>
                <ul>${userListHtml}</ul>
                <p>This is an automated notification from TimeTool.</p>
            `,
        };

        try {
            await transporter.sendMail(mailOptions);
            console.log('Contract expiry summary email sent to:', recipients.join(','));
        } catch (error) {
            console.error('Failed to send contract expiry summary email:', error);
        }
    }

    // Send individual emails to the users whose contracts are expiring
    for (const detail of expiringContractsDetails) {
        const { user } = detail;
        const mailOptions = {
            from: process.env.SMTP_FROM,
            to: user.email,
            subject: 'Your Employment Contract is Ending Soon',
            html: `
                <h1>Contract Ending Soon</h1>
                <p>Hello ${user.name},</p>
                <p>This is a reminder that your employment contract with us is scheduled to end on <b>${format(new Date(user.contract.endDate!), 'PP')}</b>.</p>
                <p>Please reach out to your supervisor or HR for more details about your contract renewal or off-boarding process.</p>
                <p>Thanks,</p>
                <p>The TimeTool Team</p>
            `,
        };
        try {
            await transporter.sendMail(mailOptions);
            console.log('Individual contract expiry email sent to:', user.email);
        } catch (error) {
            console.error('Failed to send individual contract expiry email:', error);
        }
    }
}
