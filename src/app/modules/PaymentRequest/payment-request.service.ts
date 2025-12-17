import prisma from "@utils/prisma";
import { PaymentRequest } from "@prisma/client";
import { sendEmail } from "@helpers/email.helper";

const createPaymentRequest = async (data: PaymentRequest) => {
    const result = await prisma.paymentRequest.create({
        data,
    });

    const adminHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="color: #333;">New Payment Request</h2>
        <p><strong>Name:</strong> ${data.firstName} ${data.lastName}</p>
        <p><strong>Email:</strong> ${data.email}</p>
        <p><strong>Phone:</strong> ${data.phone || 'N/A'}</p>
        <p><strong>Company:</strong> ${data.company || 'N/A'}</p>
        <p><strong>Plan:</strong> ${data.plan}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
      </div>
    `;

    // Send email to Admin
    await sendEmail({
        email: "core.rashed@gmail.com",
        subject: `New Payment Request - ${data.plan}`,
        htmlContent: adminHtml
    });

    const userHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="color: #4CAF50;">Payment Request Received</h2>
        <p>Dear ${data.firstName},</p>
        <p>Thank you for choosing <strong>QrMonitor</strong>. We have received your request for the <strong>${data.plan}</strong> plan.</p>
        <p>Our team will review your request and contact you shortly with the next steps.</p>
        <br>
        <p>Best regards,</p>
        <p><strong>QrMonitor Team</strong></p>
      </div>
    `;

    // Send email to User
    await sendEmail({
        email: data.email,
        subject: "We've received your payment request",
        htmlContent: userHtml
    });

    return result;
};

export const PaymentRequestService = {
    createPaymentRequest,
};
