import sgMail from '@sendgrid/mail';

// Initialize SendGrid with API Key
sgMail.setApiKey(process.env.SENDGRID_EMAIL_API_KEY as string);

interface EmailOptions {
    email: string;
    subject: string;
    htmlContent: string;
}

export const sendEmail = async (options: EmailOptions) => {
    const msg = {
        to: options.email,
        from: 'tools.rashed@gmail.com', // Verified sender
        subject: options.subject,
        html: options.htmlContent,
    };

    try {
        await sgMail.send(msg);
        console.log('Email sent successfully using SendGrid');
        return { success: true };
    } catch (error: any) {
        console.error('Error sending email via SendGrid:', error);
        if (error.response) {
            console.error(error.response.body);
        }
        throw error;
    }
};
