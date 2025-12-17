import { sendEmail } from "@helpers/email.helper";
import { logger } from "@helpers/logger";

const emailSender = async (to: string, subject: string, text: string, html: string) => {
  try {
    await sendEmail({
      email: to,
      subject,
      htmlContent: html || text,
    });

    logger.info(`📧 Email sent to ${to} | Subject: "${subject}"`);
  } catch (error: any) {
    logger.error(`❌ Failed to send email to ${to} | Subject: "${subject}" | Error: ${error.message}`);
  }
};

export default emailSender;
