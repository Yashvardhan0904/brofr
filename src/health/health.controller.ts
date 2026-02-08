import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';

/**
 * Health Check Controller
 *
 * Provides endpoints for Kubernetes/Docker health checks:
 * - /health - Liveness probe (is the app running?)
 * - /ready - Readiness probe (is the app ready to serve traffic?)
 */
@Controller()
export class HealthController {
  constructor(private healthService: HealthService) {}

  /**
   * Liveness probe
   *
   * Returns 200 if the application is running.
   * Used by Kubernetes to determine if the pod should be restarted.
   *
   * @returns Health status
   */
  @Get('health')
  async checkHealth() {
    return this.healthService.checkHealth();
  }

  /**
   * Readiness probe
   *
   * Returns 200 if the application is ready to serve traffic.
   * Checks database connectivity and other dependencies.
   * Used by Kubernetes to determine if traffic should be routed to this pod.
   *
   * @returns Readiness status
   */
  @Get('ready')
  async checkReadiness() {
    return this.healthService.checkReadiness();
  }
}
