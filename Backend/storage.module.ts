import { Global, Module } from '@nestjs/common';
import { StorageFactory } from './storage.factory';
import { StorageService } from './storage.service';
import { UploadService } from './upload.service';
import { DownloadService } from './download.service';
import { DeleteService } from './delete.service';
import { FileMetadataService } from './file-metadata.service';
import { SignedUrlService } from './signed-url.service';

@Global()
@Module({
  providers: [
    StorageFactory,
    StorageService,
    UploadService,
    DownloadService,
    DeleteService,
    FileMetadataService,
    SignedUrlService,
  ],
  exports: [
    StorageService,
    UploadService,
    DownloadService,
    DeleteService,
    FileMetadataService,
    SignedUrlService,
  ],
})
export class StorageModule {}
