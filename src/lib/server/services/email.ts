import { env } from '$env/dynamic/private';
import nodemailer from 'nodemailer';

function createTransport() {
	const mailUrl = env.MAIL_URL;
	if (!mailUrl) {
		return null;
	}

	return nodemailer.createTransport(mailUrl);
}

export async function sendEmail(
	to: string,
	subject: string,
	html: string,
	text?: string
): Promise<boolean> {
	const transport = createTransport();

	if (!transport) {
		console.log('--- Email (no MAIL_URL configured) ---');
		console.log(`To: ${to}`);
		console.log(`Subject: ${subject}`);
		console.log(text ?? html);
		console.log('--- End Email ---');
		return false;
	}

	try {
		await transport.sendMail({
			from: env.MAIL_FROM ?? 'Dong Chinese <noreply@dong-chinese.com>',
			to,
			subject,
			html,
			...(text ? { text } : {})
		});
		return true;
	} catch (error) {
		console.error(`Failed to send email to ${to}:`, error);
		return false;
	}
}
