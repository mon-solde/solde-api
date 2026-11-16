import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { EnvConfig } from '@config/env.validation';

@Injectable()
export class FirebaseAdminService implements OnModuleInit {
  constructor(private readonly configService: ConfigService<EnvConfig, true>) {}

  onModuleInit(): void {
    // The Admin SDK auto-redirects every admin.auth() call to the local Auth
    // Emulator when this var is set (see tests/setup) — the emulator needs
    // no real credentials, and admin.credential.cert() would otherwise throw
    // on the placeholder FIREBASE_PRIVATE_KEY used in .env.test.
    const isEmulated = Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST);

    admin.initializeApp({
      projectId: this.configService.get('FIREBASE_PROJECT_ID'),
      storageBucket: this.configService.get('FIREBASE_STORAGE_BUCKET'),
      ...(isEmulated
        ? {}
        : {
            credential: admin.credential.cert({
              projectId: this.configService.get('FIREBASE_PROJECT_ID'),
              clientEmail: this.configService.get('FIREBASE_CLIENT_EMAIL'),
              privateKey: this.configService.get('FIREBASE_PRIVATE_KEY'),
            }),
          }),
    });
  }
}
