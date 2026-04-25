import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import * as admin from 'firebase-admin';
import { IS_PUBLIC_KEY } from './public.decorator';
import { GuestUser } from './domain/authenticated-user';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(FirebaseAuthGuard.name);

  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractBearerToken(request);

    if (!token) {
      throw new UnauthorizedException();
    }

    try {
      const decodedToken = await admin.auth().verifyIdToken(token, true); // checkRevoked: true — catches deleted/revoked accounts immediately
      request['user'] = new GuestUser(
        decodedToken.uid,
        decodedToken.email ?? '',
      );
      return true;
    } catch (error) {
      this.logger.warn(
        `Token verification failed: ${(error as Error).message}`,
      );
      throw new UnauthorizedException();
    }
  }

  private extractBearerToken(request: Request): string | null {
    const authorizationHeader = request.headers.authorization;
    if (!authorizationHeader?.startsWith('Bearer ')) {
      return null;
    }
    return authorizationHeader.slice('Bearer '.length);
  }
}
