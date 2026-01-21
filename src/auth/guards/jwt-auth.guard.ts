import { Injectable, ExecutionContext, UnauthorizedException, HttpException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    console.log('🔒 JwtAuthGuard - canActivate called');
    const request = context.switchToHttp().getRequest();
    console.log('🔒 Authorization header:', request.headers.authorization);
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    console.log('🔒 JwtAuthGuard - handleRequest called');
    console.log('🔒 Error:', err);
    console.log('🔒 User:', user);
    console.log('🔒 Info:', info);
    
    // If there's an HttpException (like banned user), throw it
    if (err instanceof HttpException) {
      throw err;
    }
    
    if (err || !user) {
      console.log('🔒 Throwing UnauthorizedException');
      throw err || new UnauthorizedException();
    }
    return user;
  }
}
