import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'your-secret-key-change-in-production',
    });
  }

  async validate(payload: any) {
    console.log('🔐 JWT validate called with payload:', { sub: payload.sub, email: payload.email });
    const user = await this.authService.validateJwtPayload(payload);
    
    if (!user) {
      console.error('❌ User not found in database for ID:', payload.sub);
      console.error('💡 Hint: User may have been deleted or you need to log in again');
      throw new UnauthorizedException('User not found. Please log in again.');
    }
    
    console.log('✓ User validated:', { id: user.id, email: user.email });
    return user;
  }
}
