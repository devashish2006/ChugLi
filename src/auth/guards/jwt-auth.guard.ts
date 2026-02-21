import { Injectable, ExecutionContext, UnauthorizedException, HttpException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {

    const request = context.switchToHttp().getRequest();

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {




    
    // If there's an HttpException (like banned user), throw it
    if (err instanceof HttpException) {
      throw err;
    }
    
    if (err || !user) {

      throw err || new UnauthorizedException();
    }
    return user;
  }
}
