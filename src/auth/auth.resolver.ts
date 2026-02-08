import { Resolver, Mutation, Args, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterInput } from './dto/register.input';
import { LoginInput } from './dto/login.input';
import { ChangePasswordInput } from './dto/change-password.input';
import { AuthResponse } from './entities/auth-response.entity';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserPayload } from '../common/types/user-payload.type';

@Resolver()
export class AuthResolver {
  constructor(private authService: AuthService) {}

  @Mutation(() => AuthResponse, { description: 'Register a new user' })
  async register(
    @Args('input') input: RegisterInput,
    @Context() context: { res: Response; req: any },
  ): Promise<AuthResponse> {
    const ipAddress = this.getIpAddress(context?.req);
    const result = await this.authService.register(input, ipAddress);

    // Set HTTP-only cookie
    this.setAuthCookie(context.res, result.token);

    return result;
  }

  @Mutation(() => AuthResponse, { description: 'Login with email and password' })
  async login(
    @Args('input') input: LoginInput,
    @Context() context: { res: Response; req: any },
  ): Promise<AuthResponse> {
    console.log('=== LOGIN DEBUG ===');
    console.log('Context:', context);
    console.log('Context.req:', context?.req);
    console.log('Context.req type:', typeof context?.req);
    
    const ipAddress = this.getIpAddress(context?.req);
    console.log('IP Address:', ipAddress);
    
    const result = await this.authService.login(input, ipAddress);

    // Set HTTP-only cookie
    this.setAuthCookie(context.res, result.token);

    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Mutation(() => Boolean, { description: 'Logout current user' })
  async logout(@Context() context: { res: Response }): Promise<boolean> {
    // Clear cookie
    context.res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    return true;
  }

  @UseGuards(JwtAuthGuard)
  @Mutation(() => Boolean, { description: 'Change user password' })
  async changePassword(
    @CurrentUser() user: UserPayload,
    @Args('input') input: ChangePasswordInput,
  ): Promise<boolean> {
    return this.authService.changePassword(user.id, input.oldPassword, input.newPassword);
  }

  /**
   * Set authentication cookie
   */
  private setAuthCookie(res: Response, token: string): void {
    res.cookie('token', token, {
      httpOnly: true, // Prevents JavaScript access
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'strict', // CSRF protection
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }

  /**
   * Extract IP address from request
   */
  private getIpAddress(req: any): string {
    if (!req) {
      return '0.0.0.0';
    }
    
    return (
      req.headers?.['x-forwarded-for']?.split(',')[0] ||
      req.headers?.['x-real-ip'] ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      req.ip ||
      '0.0.0.0'
    );
  }
}
