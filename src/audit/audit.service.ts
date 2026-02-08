import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditLogData {
  userId?: string;
  action: string;
  resource: string;
  metadata?: Record<string, any>;
  ipAddress?: string; // Made optional
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create an audit log entry
   */
  async log(data: AuditLogData): Promise<void> {
    try {
      // Redact sensitive data from metadata
      const sanitizedMetadata = this.redactSensitiveData(data.metadata);

      await this.prisma.auditLog.create({
        data: {
          userId: data.userId || null,
          action: data.action,
          resource: data.resource,
          metadata: sanitizedMetadata || undefined,
          ipAddress: data.ipAddress || '0.0.0.0',
        },
      });

      this.logger.log(`Audit: ${data.action} on ${data.resource} by ${data.userId || 'anonymous'}`);
    } catch (error) {
      // Don't fail the main operation if audit logging fails
      this.logger.error(`Failed to create audit log: ${error.message}`, error.stack);
    }
  }

  /**
   * Log authentication events
   */
  async logAuth(
    action: 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'REGISTER' | 'LOGOUT',
    userId: string | null,
    ipAddress?: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    await this.log({
      userId: userId || undefined,
      action,
      resource: userId ? `User:${userId}` : 'User:anonymous',
      metadata,
      ipAddress: ipAddress || '0.0.0.0',
    });
  }

  /**
   * Log order events
   */
  async logOrder(
    action: 'ORDER_CREATED' | 'ORDER_STATUS_CHANGED' | 'ORDER_CANCELLED',
    orderId: string,
    userId: string,
    ipAddress?: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    await this.log({
      userId,
      action,
      resource: `Order:${orderId}`,
      metadata,
      ipAddress: ipAddress || '0.0.0.0',
    });
  }

  /**
   * Log payment events
   */
  async logPayment(
    action:
      | 'PAYMENT_INTENT_CREATED'
      | 'PAYMENT_WEBHOOK_RECEIVED'
      | 'PAYMENT_SUCCESS'
      | 'PAYMENT_FAILED'
      | 'PAYMENT_REFUNDED',
    paymentId: string,
    userId: string | null,
    ipAddress?: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    await this.log({
      userId: userId || undefined,
      action,
      resource: `Payment:${paymentId}`,
      metadata,
      ipAddress: ipAddress || '0.0.0.0',
    });
  }

  /**
   * Log admin operations
   */
  async logAdmin(
    action: string,
    resource: string,
    adminId: string,
    ipAddress?: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    await this.log({
      userId: adminId,
      action: `ADMIN_${action}`,
      resource,
      metadata,
      ipAddress: ipAddress || '0.0.0.0',
    });
  }

  /**
   * Log authorization failures
   */
  async logAuthorizationFailure(
    action: string,
    resource: string,
    userId: string | null,
    ipAddress?: string,
    reason?: string,
  ): Promise<void> {
    await this.log({
      userId: userId || undefined,
      action: 'AUTHORIZATION_FAILED',
      resource,
      metadata: {
        attemptedAction: action,
        reason,
      },
      ipAddress: ipAddress || '0.0.0.0',
    });
  }

  /**
   * Redact sensitive data from metadata
   */
  private redactSensitiveData(metadata?: Record<string, any>): Record<string, any> | null {
    if (!metadata) return null;

    const sensitiveKeys = [
      'password',
      'passwordHash',
      'token',
      'secret',
      'apiKey',
      'creditCard',
      'cvv',
      'ssn',
    ];

    const redacted = { ...metadata };

    for (const key of Object.keys(redacted)) {
      const lowerKey = key.toLowerCase();

      // Check if key contains sensitive terms
      if (sensitiveKeys.some((sensitive) => lowerKey.includes(sensitive))) {
        redacted[key] = '[REDACTED]';
      }

      // Recursively redact nested objects
      if (typeof redacted[key] === 'object' && redacted[key] !== null) {
        redacted[key] = this.redactSensitiveData(redacted[key]);
      }
    }

    return redacted;
  }

  /**
   * Query audit logs (admin only)
   */
  async getAuditLogs(filters: {
    userId?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }) {
    const { userId, action, startDate, endDate, limit = 100 } = filters;

    return this.prisma.auditLog.findMany({
      where: {
        ...(userId && { userId }),
        ...(action && { action }),
        ...(startDate || endDate
          ? {
              createdAt: {
                ...(startDate && { gte: startDate }),
                ...(endDate && { lte: endDate }),
              },
            }
          : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });
  }
}
