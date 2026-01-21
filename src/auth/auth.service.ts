import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { db } from 'src/db';
import { users } from 'src/db/schema';
import { eq, and } from 'drizzle-orm';
import { generateAnonymousName } from 'src/utils/anonymous-name';

export interface GoogleUser {
  email: string;
  name: string;
  picture: string;
  sub: string; // Google's unique ID
}

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  async validateGoogleUser(profile: GoogleUser) {
    try {
      // Check if user exists
      const existingUser = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.oauthProvider, 'google'),
            eq(users.oauthId, profile.sub)
          )
        )
        .limit(1);

      let user;

      if (existingUser.length > 0) {
        // Update last login and generate new anonymous name for new session
        user = existingUser[0];
        const anonymousName = generateAnonymousName();
        await db
          .update(users)
          .set({ 
            lastLogin: new Date(),
            anonymousName: anonymousName
          })
          .where(eq(users.id, user.id));
        
        // Update user object with new anonymous name
        user = { ...user, anonymousName };
      } else {
        // Create new user with anonymous name
        const anonymousName = generateAnonymousName();
        const newUser = await db
          .insert(users)
          .values({
            oauthProvider: 'google',
            oauthId: profile.sub,
            email: profile.email,
            name: profile.name,
            avatarUrl: profile.picture,
            anonymousName: anonymousName,
          })
          .returning();
        
        user = newUser[0];
      }

      // Check if user is banned
      if (user.banned) {
        throw new HttpException(
          {
            statusCode: HttpStatus.FORBIDDEN,
            message: 'Account Banned',
            banReason: user.banReason || 'Your account has been suspended for violating our community guidelines.',
            banned: true,
          },
          HttpStatus.FORBIDDEN,
        );
      }

      return user;
    } catch (error) {
      console.error('Error validating Google user:', error);
      throw error;
    }
  }

  async login(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      anonymousName: user.anonymousName,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        anonymousName: user.anonymousName,
      },
    };
  }

  async validateJwtPayload(payload: any) {
    try {
      console.log('🔍 Validating JWT payload for user ID:', payload.sub);
      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, payload.sub))
        .limit(1);

      if (user.length === 0) {
        console.warn('⚠️ No user found with ID:', payload.sub);
        return null;
      }

      if (user[0].banned) {
        console.log('🚫 User is banned:', user[0].email);
        throw new HttpException(
          {
            statusCode: HttpStatus.FORBIDDEN,
            message: 'Account Banned',
            banReason: user[0].banReason || 'Your account has been suspended for violating our community guidelines.',
            banned: true,
          },
          HttpStatus.FORBIDDEN,
        );
      }

      console.log('✓ JWT validation successful for:', user[0].email);
      return user[0];
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('❌ Error validating JWT payload:', error);
      return null;
    }
  }
}
