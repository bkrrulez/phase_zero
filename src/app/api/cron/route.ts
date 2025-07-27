
import { sendContractEndNotificationsNow } from '@/app/dashboard/actions';
import {NextResponse} from 'next/server';

export async function GET() {
    try {
        const count = await sendContractEndNotificationsNow(false);
        const now = new Date().toISOString();
        return NextResponse.json({ success: true, timestamp: now, message: `Ran contract end notifications. ${count} notifications sent.` });
    } catch (error) {
        console.error('Cron job failed:', error);
        const now = new Date().toISOString();
        return NextResponse.json({ success: false, timestamp: now, message: 'Cron job failed.' }, { status: 500 });
    }
}
