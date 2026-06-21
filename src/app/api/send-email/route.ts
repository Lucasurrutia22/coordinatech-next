import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/send-email
 * Envía un email con la copia de la orden de trabajo
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, subject, htmlContent, textContent, attachments } = body;

    // Validar campos requeridos
    if (!to || !subject) {
      return NextResponse.json(
        { error: "Missing required fields: to, subject" },
        { status: 400 }
      );
    }

    // Opción 1: Usar Resend (si está configurado)
    if (process.env.RESEND_API_KEY) {
      return await sendViaResend(to, subject, htmlContent || textContent);
    }

    // Opción 2: Usar SendGrid (si está configurado)
    if (process.env.SENDGRID_API_KEY) {
      return await sendViaSendGrid(to, subject, htmlContent || textContent);
    }

    // Opción 3: Usar Gmail SMTP (si está configurado)
    if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
      return await sendViaGmailSMTP(to, subject, htmlContent || textContent);
    }

    // Si no hay configuración, devolver un error
    console.warn(
      "[send-email] No email service configured. Configure RESEND_API_KEY, SENDGRID_API_KEY, or EMAIL_USER/EMAIL_PASSWORD"
    );

    // En desarrollo, permitir que funcione sin error (solo loguear)
    if (process.env.NODE_ENV === "development") {
      console.log("[send-email] DEV MODE - Email logged instead of sent");
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`Content: ${htmlContent || textContent}`);
      return NextResponse.json(
        {
          success: true,
          message: "Email logged (development mode)",
          recipient: to,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { error: "Email service not configured" },
      { status: 500 }
    );
  } catch (error) {
    console.error("[send-email]:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to send email",
      },
      { status: 500 }
    );
  }
}

/**
 * Enviar email via Resend
 */
async function sendViaResend(to: string, subject: string, content: string) {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "noreply@coordinatech.com",
        to,
        subject,
        html: content,
      }),
    });

    if (!response.ok) {
      throw new Error(`Resend API error: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("[send-email] Email sent via Resend:", data.id);

    return NextResponse.json(
      { success: true, message: "Email sent successfully", id: data.id },
      { status: 200 }
    );
  } catch (error) {
    console.error("[send-email] Resend error:", error);
    throw error;
  }
}

/**
 * Enviar email via SendGrid
 */
async function sendViaSendGrid(to: string, subject: string, content: string) {
  try {
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: to }],
            subject,
          },
        ],
        from: {
          email: process.env.EMAIL_FROM || "noreply@coordinatech.com",
          name: "CoordinaTech",
        },
        content: [
          {
            type: "text/html",
            value: content,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`SendGrid API error: ${response.statusText}`);
    }

    console.log("[send-email] Email sent via SendGrid");

    return NextResponse.json(
      { success: true, message: "Email sent successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("[send-email] SendGrid error:", error);
    throw error;
  }
}

/**
 * Enviar email via Gmail SMTP (usando fetch a un servicio externo)
 * NOTA: Para usar esto en producción, necesitas un servicio intermedio
 * que maneje SMTP, ya que SMTP no funciona directamente desde navegadores/APIs
 */
async function sendViaGmailSMTP(
  to: string,
  subject: string,
  content: string
) {
  // Aquí iría la lógica de SMTP, pero normalmente se hace desde un servidor backend
  // Por ahora, solo loguear
  console.log("[send-email] Gmail SMTP configured but not implemented");
  throw new Error(
    "Gmail SMTP not directly supported. Use Resend or SendGrid instead."
  );
}
