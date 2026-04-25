import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { FirebaseAdminService } from './firebase-admin.service';
import { FirebaseAuthGuard } from './firebase-auth.guard';
import { RolesGuard } from './roles.guard';

@Module({
  providers: [
    FirebaseAdminService,
    { provide: APP_GUARD, useClass: FirebaseAuthGuard }, // 1st: verifies identity
    { provide: APP_GUARD, useClass: RolesGuard }, // 2nd: verifies role
  ],
})
export class AuthModule {}
