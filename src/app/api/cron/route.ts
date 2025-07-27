
import { sendContractEndNotificationsNow } from '@/app/dashboard/actions';
import {NextResponse} from 'next/server';

export async function GET() {
    try {
        const count = await sendContractEndNotificationsNow(false);
        return NextResponse.json({ success: true, message: `Ran contract end notifications. ${count} notifications sent.` });
    } catch (error) {
        console.error('Cron job failed:', error);
        return NextResponse.json({ success: false, message: 'Cron job failed.' }, { status: 500 });
    }
}
