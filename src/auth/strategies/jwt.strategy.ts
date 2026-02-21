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

    const user = await this.authService.validateJwtPayload(payload);
    
    if (!user) {
      console.error('❌ User not found in database for ID:', payload.sub);
      console.error('💡 Hint: User may have been deleted or you need to log in again');
      throw new UnauthorizedException('User not found. Please log in again.');
    }
    

    return user;
  }
}
