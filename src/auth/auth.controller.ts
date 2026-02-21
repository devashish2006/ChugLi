import { Controller, Get, Req, UseGuards, Res, Post, Body, HttpException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import type { Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // Initiates Google OAuth flow
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(@Req() req, @Res() res: Response) {
    try {
      const loginResult = await this.authService.login(req.user);
      
      // Redirect to frontend with token
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/auth/callback?token=${loginResult.access_token}`);
    } catch (error) {
      console.error('Google auth callback error:', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      
      // Check if user is banned
      if (error instanceof HttpException && error.getResponse()['banned']) {
        const response = error.getResponse() as any;
        const bannedAt = response.bannedAt ? new Date(response.bannedAt).toISOString() : new Date().toISOString();
        res.redirect(`${frontendUrl}/banned?reason=${encodeURIComponent(response.banReason)}&bannedAt=${encodeURIComponent(bannedAt)}`);
      } else {
        res.redirect(`${frontendUrl}/auth/error?message=${encodeURIComponent(error.message)}`);
      }
    }
  }

  @Post('validate-google')
  async validateGoogleUser(@Body() body: { oauthId: string; email: string; name: string; picture: string }) {
    try {
      const user = await this.authService.validateGoogleUser({
        sub: body.oauthId,
        email: body.email,
        name: body.name,
        picture: body.picture,
      });

      return await this.authService.login(user);
    } catch (error) {
      // Re-throw HttpException as-is so NextAuth can see the status code
      if (error instanceof HttpException) {
        throw error;
      }
      throw error;
    }
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  async getProfile(@Req() req) {
    // If we reach here, user is not banned (guard would have thrown 403)
    return {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      avatarUrl: req.user.avatarUrl,
      anonymousName: req.user.anonymousName,
      banned: false,
    };
  }
}
