// services/sesService.js
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { logger } from "../utils/logger.js";

let sesClient = null;

function getSesClient() {
  if (sesClient) return sesClient;

  if (!process.env.AWS_REGION) {
    throw new Error("AWS_REGION is not set");
  }

  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    throw new Error("AWS credentials are not set");
  }

  sesClient = new SESClient({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  logger.info(
    { region: process.env.AWS_REGION },
    "[SES] client initialized"
  );

  return sesClient;
}

export function createSesService() {
  const client = getSesClient();
  const log = logger.child({ service: "ses" });

  return {
    /**
     * Envía un email usando Amazon SES (API HTTPS)
     */
    async sendEmail({ from, to, bcc, subject, text, html }) {
      if (!from || !to) {
        throw new Error("SES sendEmail requires 'from' and 'to'");
      }

      const toAddresses = Array.isArray(to) ? to : [to];
      const bccAddresses = bcc
        ? Array.isArray(bcc) ? bcc : [bcc]
        : undefined;

      log.info(
        {
          from,
          to: toAddresses,
          bcc: bccAddresses,
          subject,
        },
        "[SES] sending email"
      );

      const command = new SendEmailCommand({
        Source: from,
        Destination: {
          ToAddresses: toAddresses,
          ...(bccAddresses ? { BccAddresses: bccAddresses } : {}),
        },
        Message: {
          Subject: { Data: subject, Charset: "UTF-8" },
          Body: {
            ...(text ? { Text: { Data: text, Charset: "UTF-8" } } : {}),
            ...(html ? { Html: { Data: html, Charset: "UTF-8" } } : {}),
          },
        },
      });

      try {
        const result = await client.send(command);

        log.info(
          {
            messageId: result.MessageId,
            to: toAddresses,
            subject,
          },
          "[SES] email sent"
        );

        return result;
      } catch (err) {
        log.error(
          {
            err,
            to: toAddresses,
            subject,
          },
          "[SES] email send failed"
        );
        throw err;
      }
    },
  };
}