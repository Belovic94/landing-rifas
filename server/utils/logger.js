import pino from "pino";

const isProd = process.env.NODE_ENV === "prod";

// Si querés pretty+colores en prod también, poné LOG_PRETTY=true
const pretty = process.env.LOG_PRETTY === "true";

const transport =
  (!isProd || pretty)
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          singleLine: true,      // <- TODO en una sola línea
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      }
    : undefined;

// En prod (sin pretty) pino ya loguea JSON en 1 línea.
export const logger = pino(
  {
    level: process.env.LOG_LEVEL || (isProd ? "info" : "debug"),
    base: { service: process.env.SERVICE_NAME || "rifas-FAME" },
  },
  transport ? pino.transport(transport) : undefined
);
