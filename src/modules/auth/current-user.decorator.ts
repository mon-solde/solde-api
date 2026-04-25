import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Extracts req.user from the request.
 *
 * Without @Roles() (registration flow): returns GuestUser — set by FirebaseAuthGuard.
 * With @Roles() (protected routes): returns RegisteredUser — set by RolesGuard.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    return ctx.switchToHttp().getRequest().user;
  },
);
