import { pool } from "./db";

export enum DatabaseErrorType {
  CONNECTION_ERROR = "CONNECTION_ERROR",
  QUERY_ERROR = "QUERY_ERROR",
  TIMEOUT_ERROR = "TIMEOUT_ERROR",
  CONSTRAINT_VIOLATION = "CONSTRAINT_VIOLATION",
  NOT_FOUND = "NOT_FOUND",
  TRANSACTION_ERROR = "TRANSACTION_ERROR",
  UNKNOWN = "UNKNOWN",
}

export class DatabaseError extends Error {
  public readonly type: DatabaseErrorType;
  public readonly originalError: Error | unknown;
  public readonly query?: string;
  public readonly timestamp: Date;
  public readonly retryable: boolean;

  constructor(
    message: string,
    type: DatabaseErrorType,
    originalError?: Error | unknown,
    query?: string
  ) {
    super(message);
    this.name = "DatabaseError";
    this.type = type;
    this.originalError = originalError;
    this.query = query;
    this.timestamp = new Date();
    this.retryable = this.isRetryable(type, originalError);
  }

  private isRetryable(type: DatabaseErrorType, originalError: unknown): boolean {
    if (type === DatabaseErrorType.CONNECTION_ERROR) return true;
    if (type === DatabaseErrorType.TIMEOUT_ERROR) return true;
    
    if (originalError instanceof Error) {
      const errorCode = (originalError as any).code;
      const retryableCodes = [
        "ECONNRESET",
        "ECONNREFUSED",
        "ETIMEDOUT",
        "EPIPE",
        "57P01", // admin_shutdown
        "57P02", // crash_shutdown
        "57P03", // cannot_connect_now
        "08006", // connection_failure
        "08001", // sqlclient_unable_to_establish_sqlconnection
        "08004", // sqlserver_rejected_establishment_of_sqlconnection
        "40001", // serialization_failure
        "40P01", // deadlock_detected
      ];
      return retryableCodes.includes(errorCode);
    }
    return false;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      type: this.type,
      timestamp: this.timestamp.toISOString(),
      retryable: this.retryable,
      originalError: this.originalError instanceof Error 
        ? { message: this.originalError.message, code: (this.originalError as any).code }
        : String(this.originalError),
    };
  }
}

function classifyError(error: unknown): DatabaseErrorType {
  if (!(error instanceof Error)) {
    return DatabaseErrorType.UNKNOWN;
  }

  const errorCode = (error as any).code;
  const errorMessage = error.message.toLowerCase();

  if (
    errorCode === "ECONNREFUSED" ||
    errorCode === "ECONNRESET" ||
    errorCode === "ENOTFOUND" ||
    errorMessage.includes("connection") ||
    errorMessage.includes("connect")
  ) {
    return DatabaseErrorType.CONNECTION_ERROR;
  }

  if (
    errorCode === "ETIMEDOUT" ||
    errorMessage.includes("timeout") ||
    errorMessage.includes("timed out")
  ) {
    return DatabaseErrorType.TIMEOUT_ERROR;
  }

  if (
    errorCode === "23505" || // unique_violation
    errorCode === "23503" || // foreign_key_violation
    errorCode === "23502" || // not_null_violation
    errorCode === "23514" || // check_violation
    errorMessage.includes("constraint") ||
    errorMessage.includes("violates")
  ) {
    return DatabaseErrorType.CONSTRAINT_VIOLATION;
  }

  if (
    errorCode === "40001" || // serialization_failure
    errorCode === "40P01" || // deadlock_detected
    errorMessage.includes("transaction") ||
    errorMessage.includes("deadlock")
  ) {
    return DatabaseErrorType.TRANSACTION_ERROR;
  }

  return DatabaseErrorType.QUERY_ERROR;
}

export function logDatabaseError(
  operation: string,
  error: DatabaseError,
  context?: Record<string, unknown>
): void {
  const logEntry = {
    level: "error",
    timestamp: error.timestamp.toISOString(),
    operation,
    errorType: error.type,
    message: error.message,
    retryable: error.retryable,
    context,
    originalError: error.originalError instanceof Error
      ? { 
          message: error.originalError.message, 
          code: (error.originalError as any).code,
          stack: error.originalError.stack 
        }
      : String(error.originalError),
  };

  console.error(`[DB_ERROR] ${operation}:`, JSON.stringify(logEntry, null, 2));
}

export function logDatabaseWarning(
  operation: string,
  message: string,
  context?: Record<string, unknown>
): void {
  console.warn(`[DB_WARN] ${operation}: ${message}`, context ? JSON.stringify(context) : "");
}

export function logDatabaseInfo(
  operation: string,
  message: string,
  context?: Record<string, unknown>
): void {
  if (process.env.NODE_ENV === "development") {
    console.log(`[DB_INFO] ${operation}: ${message}`, context ? JSON.stringify(context) : "");
  }
}

interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  onRetry?: (attempt: number, error: DatabaseError) => void;
}

const DEFAULT_RETRY_OPTIONS: Required<Omit<RetryOptions, "onRetry">> = {
  maxRetries: 3,
  baseDelayMs: 100,
  maxDelayMs: 2000,
};

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function calculateBackoff(attempt: number, baseDelay: number, maxDelay: number): number {
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * 100;
  return Math.min(exponentialDelay + jitter, maxDelay);
}

export async function withDatabaseErrorHandling<T>(
  operation: string,
  fn: () => Promise<T>,
  options?: RetryOptions & { context?: Record<string, unknown> }
): Promise<T> {
  const { 
    maxRetries = DEFAULT_RETRY_OPTIONS.maxRetries,
    baseDelayMs = DEFAULT_RETRY_OPTIONS.baseDelayMs,
    maxDelayMs = DEFAULT_RETRY_OPTIONS.maxDelayMs,
    onRetry,
    context,
  } = options || {};

  let lastError: DatabaseError | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      
      if (attempt > 0) {
        logDatabaseInfo(operation, `Succeeded after ${attempt} retries`);
      }
      
      return result;
    } catch (error) {
      const errorType = classifyError(error);
      const dbError = new DatabaseError(
        error instanceof Error ? error.message : String(error),
        errorType,
        error
      );

      lastError = dbError;

      if (dbError.retryable && attempt < maxRetries) {
        const delayMs = calculateBackoff(attempt, baseDelayMs, maxDelayMs);
        logDatabaseWarning(operation, `Attempt ${attempt + 1} failed, retrying in ${delayMs}ms`, {
          errorType,
          attempt: attempt + 1,
          maxRetries,
        });

        if (onRetry) {
          onRetry(attempt + 1, dbError);
        }

        await delay(delayMs);
        continue;
      }

      logDatabaseError(operation, dbError, context);
      throw dbError;
    }
  }

  throw lastError || new DatabaseError("Unknown error occurred", DatabaseErrorType.UNKNOWN);
}

export async function withTransaction<T>(
  operation: string,
  fn: (client: any) => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  return withDatabaseErrorHandling(
    operation,
    async () => {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const result = await fn(client);
        await client.query("COMMIT");
        return result;
      } catch (error) {
        await client.query("ROLLBACK").catch((rollbackError) => {
          console.error(`[DB_ERROR] Rollback failed for ${operation}:`, rollbackError);
        });
        throw error;
      } finally {
        client.release();
      }
    },
    options
  );
}

export async function checkDatabaseHealth(): Promise<{
  healthy: boolean;
  latencyMs: number;
  poolStats: { total: number; idle: number; waiting: number };
  error?: string;
}> {
  const startTime = Date.now();
  
  try {
    await pool.query("SELECT 1");
    const latencyMs = Date.now() - startTime;
    
    return {
      healthy: true,
      latencyMs,
      poolStats: {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount,
      },
    };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    logDatabaseError("healthCheck", new DatabaseError(
      errorMessage,
      DatabaseErrorType.CONNECTION_ERROR,
      error
    ));

    return {
      healthy: false,
      latencyMs,
      poolStats: {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount,
      },
      error: errorMessage,
    };
  }
}

export function createSafeOperation<TArgs extends unknown[], TResult>(
  operationName: string,
  fn: (...args: TArgs) => Promise<TResult>,
  options?: RetryOptions
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs): Promise<TResult> => {
    return withDatabaseErrorHandling(
      operationName,
      () => fn(...args),
      { ...options, context: { args: args.map(a => typeof a === 'object' ? '[object]' : a) } }
    );
  };
}

export { pool };
