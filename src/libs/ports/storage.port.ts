export interface FileUploadParams {
  buffer: Buffer;
  mimeType: string;
  // Path within the bucket, e.g. "registration-documents/uid/doc-type-id/front.jpg"
  storagePath: string;
}

export interface StoragePort {
  uploadFile(params: FileUploadParams): Promise<void>;
  deleteFile(storagePath: string): Promise<void>;
  generateSignedUrl(
    storagePath: string,
    expiresInSeconds: number,
  ): Promise<string>;
}
