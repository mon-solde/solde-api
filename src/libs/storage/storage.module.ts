import { Module } from '@nestjs/common';
import { STORAGE_PORT } from './storage.di-tokens';
import { FirebaseStorageAdapter } from './firebase-storage.adapter';

@Module({
  providers: [{ provide: STORAGE_PORT, useClass: FirebaseStorageAdapter }],
  exports: [STORAGE_PORT],
})
export class StorageModule {}
