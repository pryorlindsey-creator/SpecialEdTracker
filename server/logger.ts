import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import path from "path";

const isDevelopment = process.env.NODE_ENV !== "production";

const customFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaString = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    return `${timestamp} [${level.toUpperCase()}] ${message}${metaString}`;
  })
);

const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: "HH:mm:ss A" }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaString = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    return `${timestamp} [${level}] ${message}${metaString}`;
  })
);

const fileTransport = new DailyRotateFile({
  filename: path.join("logs", "app-%DATE%.log"),
  datePattern: "YYYY-MM-DD",
  maxSize: "20m",
  maxFiles: "14d",
  format: customFormat,
  level: "info",
});

const errorFileTransport = new DailyRotateFile({
  filename: path.join("logs", "error-%DATE%.log"),
  datePattern: "YYYY-MM-DD",
  maxSize: "20m",
  maxFiles: "30d",
  format: customFormat,
  level: "error",
});

const consoleTransport = new winston.transports.Console({
  format: consoleFormat,
  level: isDevelopment ? "debug" : "info",
});

export const logger = winston.createLogger({
  level: isDevelopment ? "debug" : "info",
  defaultMeta: { service: "iep-tracker" },
  transports: [consoleTransport, fileTransport, errorFileTransport],
  exceptionHandlers: [
    new winston.transports.File({ filename: path.join("logs", "exceptions.log") }),
    consoleTransport,
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: path.join("logs", "rejections.log") }),
    consoleTransport,
  ],
});

export function logAppStart(port: number): void {
  logger.info("Application started", {
    port,
    environment: process.env.NODE_ENV || "development",
    nodeVersion: process.version,
    pid: process.pid,
  });
}

export function logAppStop(reason: string): void {
  logger.info("Application stopping", { reason });
}

export function logHttpRequest(
  method: string,
  path: string,
  statusCode: number,
  duration: number,
  userId?: string
): void {
  const level = statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "info";
  logger[level](`${method} ${path} ${statusCode} in ${duration}ms`, {
    method,
    path,
    statusCode,
    duration,
    ...(userId && { userId }),
  });
}

export function logDbOperation(
  operation: string,
  table: string,
  duration?: number,
  context?: Record<string, unknown>
): void {
  logger.debug(`DB: ${operation} on ${table}`, {
    operation,
    table,
    ...(duration !== undefined && { duration: `${duration}ms` }),
    ...context,
  });
}

export function logDbError(
  operation: string,
  error: Error | unknown,
  context?: Record<string, unknown>
): void {
  const errorDetails =
    error instanceof Error
      ? { message: error.message, stack: error.stack, code: (error as any).code }
      : { message: String(error) };

  logger.error(`DB Error: ${operation}`, {
    operation,
    error: errorDetails,
    ...context,
  });
}

export function logAuthEvent(
  event: "login" | "logout" | "session_created" | "session_expired" | "auth_failed",
  userId?: string,
  context?: Record<string, unknown>
): void {
  const level = event === "auth_failed" ? "warn" : "info";
  logger[level](`Auth: ${event}`, { event, ...(userId && { userId }), ...context });
}

export function logBusinessOperation(
  operation: string,
  entity: string,
  entityId?: string | number,
  context?: Record<string, unknown>
): void {
  logger.info(`${operation}: ${entity}`, {
    operation,
    entity,
    ...(entityId !== undefined && { entityId }),
    ...context,
  });
}

export function logError(
  message: string,
  error?: Error | unknown,
  context?: Record<string, unknown>
): void {
  const errorDetails =
    error instanceof Error
      ? { message: error.message, stack: error.stack }
      : error
      ? { message: String(error) }
      : {};

  logger.error(message, { ...errorDetails, ...context });
}

export function logWarning(message: string, context?: Record<string, unknown>): void {
  logger.warn(message, context);
}

export function logInfo(message: string, context?: Record<string, unknown>): void {
  logger.info(message, context);
}

export function logDebug(message: string, context?: Record<string, unknown>): void {
  logger.debug(message, context);
}

export default logger;
