import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { EnvConfig } from '@config/env.validation';

@Injectable()
export class FirebaseAdminService implements OnModuleInit {
  constructor(private readonly configService: ConfigService<EnvConfig, true>) {}

  onModuleInit(): void {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: this.configService.get('FIREBASE_PROJECT_ID'),
        clientEmail: this.configService.get('FIREBASE_CLIENT_EMAIL'),
        privateKey: this.configService.get('FIREBASE_PRIVATE_KEY'),
      }),
      storageBucket: this.configService.get('FIREBASE_STORAGE_BUCKET'),
    });
  }
}
