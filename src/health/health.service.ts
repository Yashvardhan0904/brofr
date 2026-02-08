import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface HealthStatus {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
  checks?: {
    database?: {
      status: 'ok' | 'error';
      responseTime?: number;
    };
  };
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly startTime = Date.now();

  constructor(private prisma: PrismaService) {}

  /**
   * Check if application is alive
   *
   * This is a simple liveness check that returns OK if the process is running.
   * Does not check dependencies.
   */
  async checkHealth(): Promise<HealthStatus> {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }

  /**
   * Check if application is ready to serve traffic
   *
   * This checks:
   * - Database connectivity
   * - Other critical dependencies
   *
   * Returns error if any dependency is unavailable.
   */
  async checkReadiness(): Promise<HealthStatus> {
    const checks: HealthStatus['checks'] = {};

    try {
      // Check database connectivity
      const dbStart = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      const dbResponseTime = Date.now() - dbStart;

      checks.database = {
        status: 'ok',
        responseTime: dbResponseTime,
      };

      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: Math.floor((Date.now() - this.startTime) / 1000),
        checks,
      };
    } catch (error) {
      this.logger.error('Readiness check failed', error);

      checks.database = {
        status: 'error',
      };

      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        uptime: Math.floor((Date.now() - this.startTime) / 1000),
        checks,
      };
    }
  }

  /**
   * Get detailed health information (for internal monitoring)
   *
   * This provides more detailed information about the application state.
   * Should not be exposed publicly as it may contain sensitive information.
   */
  async getDetailedHealth(): Promise<{
    status: 'ok' | 'error';
    timestamp: string;
    uptime: number;
    version: string;
    environment: string;
    checks: {
      database: {
        status: 'ok' | 'error';
        responseTime?: number;
        error?: string;
      };
      memory: {
        used: number;
        total: number;
        percentage: number;
      };
    };
  }> {
    const checks: any = {
      memory: this.getMemoryUsage(),
    };

    try {
      const dbStart = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      const dbResponseTime = Date.now() - dbStart;

      checks.database = {
        status: 'ok',
        responseTime: dbResponseTime,
      };
    } catch (error: any) {
      checks.database = {
        status: 'error',
        error: error.message,
      };
    }

    return {
      status: checks.database.status === 'ok' ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks,
    };
  }

  /**
   * Get memory usage information
   */
  private getMemoryUsage() {
    const usage = process.memoryUsage();
    const total = usage.heapTotal;
    const used = usage.heapUsed;

    return {
      used: Math.round(used / 1024 / 1024), // MB
      total: Math.round(total / 1024 / 1024), // MB
      percentage: Math.round((used / total) * 100),
    };
  }
}
