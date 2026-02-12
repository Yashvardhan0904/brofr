import { Controller, Get, UseGuards, Req, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { AuthService } from './auth.service';

@Controller('auth')
export class GoogleAuthController {
  constructor(private authService: AuthService) {}

  /**
   * GET /auth/google
   * Redirects user to Google OAuth consent screen
   */
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // Guard redirects to Google
  }

  /**
   * GET /auth/google/callback
   * Google redirects here after user consents
   * We find/create the user, generate JWT, and redirect to frontend with token
   */
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(@Req() req: any, @Res() res: Response) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    try {
      const googleUser = req.user;

      if (!googleUser) {
        return res.redirect(`${frontendUrl}/auth?error=google_auth_failed`);
      }

      // Find or create user & generate token
      const result = await this.authService.googleLogin(googleUser);

      // Set HTTP-only cookie
      res.cookie('token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax', // 'lax' needed for cross-origin redirect
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      // Redirect to frontend with token in URL (frontend will store it)
      return res.redirect(
        `${frontendUrl}/auth/google/callback?token=${result.token}&userId=${result.user.id}&email=${encodeURIComponent(result.user.email)}&name=${encodeURIComponent(result.user.name || '')}&role=${result.user.role}`,
      );
    } catch (error) {
      console.error('Google auth callback error:', error);
      return res.redirect(`${frontendUrl}/auth?error=google_auth_failed`);
    }
  }
}
