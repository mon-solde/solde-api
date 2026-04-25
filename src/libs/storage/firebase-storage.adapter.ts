import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { FileUploadParams, StoragePort } from '@libs/ports/storage.port';

@Injectable()
export class FirebaseStorageAdapter implements StoragePort {
  private readonly logger = new Logger(FirebaseStorageAdapter.name);

  async uploadFile({
    buffer,
    mimeType,
    storagePath,
  }: FileUploadParams): Promise<void> {
    const bucket = admin.storage().bucket();
    this.logger.log(
      `[uploadFile] Début de l'upload — storagePath="${storagePath}", mimeType=${mimeType}, bufferLength=${buffer?.length}`,
    );
    this.logger.log(`[uploadFile] Nom du bucket Firebase : "${bucket.name}"`);

    const file = bucket.file(storagePath);
    this.logger.log(`[uploadFile] Appel de file.save()...`);
    await file.save(buffer, { contentType: mimeType });
    this.logger.log(
      `[uploadFile] file.save() terminé — storagePath="${storagePath}"`,
    );
  }

  async deleteFile(storagePath: string): Promise<void> {
    this.logger.log(`[deleteFile] Suppression — storagePath="${storagePath}"`);
    await admin.storage().bucket().file(storagePath).delete();
    this.logger.log(`[deleteFile] Supprimé — storagePath="${storagePath}"`);
  }

  async generateSignedUrl(
    storagePath: string,
    expiresInSeconds: number,
  ): Promise<string> {
    this.logger.log(
      `[generateSignedUrl] Génération d'une URL signée — storagePath="${storagePath}", expiresInSeconds=${expiresInSeconds}`,
    );
    const expiresAt = Date.now() + expiresInSeconds * 1000;
    this.logger.log(
      `[generateSignedUrl] Expiration à : ${new Date(expiresAt).toISOString()}`,
    );

    const [url] = await admin
      .storage()
      .bucket()
      .file(storagePath)
      .getSignedUrl({
        action: 'read',
        expires: expiresAt,
      });

    this.logger.log(
      `[generateSignedUrl] URL signée générée (longueur=${url.length})`,
    );
    return url;
  }
}
