// services/sesService.js
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

let sesClient = null;

function getSesClient() {
  if (!sesClient) {
    if (!process.env.AWS_REGION) {
      throw new Error("AWS_REGION is not set");
    }

    sesClient = new SESClient({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });

    console.log("[SES] client initialized", {
      region: process.env.AWS_REGION,
    });
  }

  return sesClient;
}

export function createSesService() {
  const client = getSesClient();

  return {
    /**
     * Envía un email usando Amazon SES (API HTTPS)
     */
    async sendEmail({ from, to, bcc, subject, text, html }) {
      if (!from || !to) {
        throw new Error("SES sendEmail requires 'from' and 'to'");
      }

      const command = new SendEmailCommand({
        Source: from,
        Destination: {
          ToAddresses: Array.isArray(to) ? to : [to],
          ...(bcc ? { BccAddresses: Array.isArray(bcc) ? bcc : [bcc] } : {}),
        },
        Message: {
          Subject: { Data: subject, Charset: "UTF-8" },
          Body: {
            ...(text ? { Text: { Data: text, Charset: "UTF-8" } } : {}),
            ...(html ? { Html: { Data: html, Charset: "UTF-8" } } : {}),
          },
        },
      });

      await client.send(command);

      console.log("[SES] email sent", {
        to,
        subject,
      });
    },
  };
}
