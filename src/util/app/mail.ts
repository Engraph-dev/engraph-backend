import { Resend } from "resend"

import { RESEND_API_KEY, RESEND_SENDER_ADDRESS } from "@/util/config/auth"

const resendClient = new Resend(RESEND_API_KEY)

type HTMLTemplateArgs = {
	mailTitle?: string
	mailBody: string
}

function htmlTemplate(args: HTMLTemplateArgs) {
	const { mailTitle = "Engraph.dev", mailBody } = args
	const nowYear = new Date().getFullYear()

	return `
		<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>${mailTitle}</title>
			<style>
				body {
					font-family: Arial, sans-serif;
					margin: 0;
					padding: 0;
					background-color: #f4f4f4;
				}
				.container {
					width: 100%;
					padding: 20px;
					background-color: #ffffff;
					max-width: 600px;
					margin: 0 auto;
					border: 1px solid #dddddd;
					border-radius: 5px;
				}
				.header {
					background-color: #6a0dad;
					padding: 20px;
					color: #ffffff;
					text-align: center;
					border-top-left-radius: 5px;
					border-top-right-radius: 5px;
				}
				.header h1 {
					margin: 0;
					font-size: 24px;
				}
				.content {
					padding: 20px;
					color: #333333;
				}
				.content h2 {
					color: #6a0dad;
				}
				.footer {
					background-color: #eeeeee;
					padding: 10px;
					text-align: center;
					color: #666666;
					border-bottom-left-radius: 5px;
					border-bottom-right-radius: 5px;
				}
				.footer a {
					color: #6a0dad;
					text-decoration: none;
				}
			</style>
		</head>
		<body>
			<div class="container">
				<div class="header">
					<h1>${mailTitle}</h1>
				</div>
				<div class="content">
					${mailBody}
				</div>
				<div class="footer">
					<p>&copy;${nowYear} Engraph. All rights reserved.</p>
				</div>
			</div>
		</body>
		</html>
	`
}

type SendMailArgs = {
	to: string
	subject: string
	contentTitle: string
	contentBody: string
}

export async function sendMail(args: SendMailArgs) {
	try {
		return resendClient.emails.send({
			to: [args.to],
			html: htmlTemplate({
				mailTitle: args.contentTitle,
				mailBody: args.contentBody,
			}),
			from: RESEND_SENDER_ADDRESS,
			subject: args.subject,
		})
	} catch (e) {
		console.error(e)
	}
}
