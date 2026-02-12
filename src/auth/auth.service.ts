import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RegisterInput } from './dto/register.input';
import { LoginInput } from './dto/login.input';
import { User } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private auditService: AuditService,
  ) {}

  /**
   * Register a new user
   */
  async register(
    input: RegisterInput,
    ipAddress: string = '0.0.0.0',
  ): Promise<{ user: User; token: string }> {
    const { email, password, name, phone } = input;

    // Check if user already exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, ...(phone ? [{ phone }] : [])],
      },
    });

    if (existingUser) {
      if (existingUser.email === email) {
        throw new ConflictException('Email already registered');
      }
      if (existingUser.phone === phone) {
        throw new ConflictException('Phone number already registered');
      }
    }

    // Validate password strength
    if (password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        phone,
      },
    });

    // Generate JWT token
    const token = this.generateToken(user);

    // Log registration
    await this.auditService.logAuth('REGISTER', user.id, ipAddress, {
      email: user.email,
      name: user.name,
    });

    return { user, token };
  }

  /**
   * Login user with email/password
   */
  async login(
    input: LoginInput,
    ipAddress: string = '0.0.0.0',
  ): Promise<{ user: User; token: string }> {
    const { email, password } = input;

    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Log failed login attempt
      await this.auditService.logAuth('LOGIN_FAILED', null, ipAddress, {
        email,
        reason: 'User not found',
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      // Log failed login attempt
      await this.auditService.logAuth('LOGIN_FAILED', user.id, ipAddress, {
        email,
        reason: 'Account deactivated',
      });
      throw new UnauthorizedException('Account is deactivated');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      // Log failed login attempt
      await this.auditService.logAuth('LOGIN_FAILED', user.id, ipAddress, {
        email,
        reason: 'Invalid password',
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT token
    const token = this.generateToken(user);

    // Log successful login
    await this.auditService.logAuth('LOGIN_SUCCESS', user.id, ipAddress, {
      email: user.email,
    });

    return { user, token };
  }

  /**
   * Validate user by ID (used by JWT strategy)
   */
  async validateUser(userId: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.isActive) {
      return null;
    }

    return user;
  }

  /**
   * Generate JWT token
   */
  private generateToken(user: User): string {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return this.jwtService.sign(payload);
  }

  /**
   * Verify JWT token
   */
  async verifyToken(token: string): Promise<any> {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  /**
   * Change password
   */
  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verify old password
    const isPasswordValid = await bcrypt.compare(oldPassword, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid old password');
    }

    // Validate new password
    if (newPassword.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return true;
  }

  /**
   * Google OAuth login - find or create user
   */
  async googleLogin(googleUser: {
    googleId: string;
    email: string;
    name: string;
    avatar?: string;
  }): Promise<{ user: User; token: string }> {
    const { googleId, email, name, avatar } = googleUser;

    // First, try to find user by googleId
    let user = await this.prisma.user.findUnique({
      where: { googleId },
    });

    if (!user) {
      // Try to find user by email (existing email/password user linking Google)
      user = await this.prisma.user.findUnique({
        where: { email },
      });

      if (user) {
        // Link Google account to existing user
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            googleId,
            ...(avatar && !user.name ? { name } : {}),
          },
        });
      } else {
        // Create new user with Google account (no password needed)
        user = await this.prisma.user.create({
          data: {
            email,
            googleId,
            name: name || email.split('@')[0],
            passwordHash: '', // No password for Google-only users
          },
        });
      }
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Generate JWT token
    const token = this.generateToken(user);

    // Log Google login
    await this.auditService.logAuth('GOOGLE_LOGIN', user.id, '0.0.0.0', {
      email: user.email,
      provider: 'google',
    } as Record<string, any>);

    return { user, token };
  }
}
