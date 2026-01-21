import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class AdminGuard implements CanActivate {
  private readonly ADMIN_EMAIL = 'mshubh612@gmail.com';

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.email) {
      throw new ForbiddenException('Authentication required');
    }

    if (user.email !== this.ADMIN_EMAIL) {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}
