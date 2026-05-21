import { Injectable } from '@nestjs/common';
import * as sharp from 'sharp';
import { S3Service } from '@/infra/aws/s3/s3.service';
import { DocumentsRepository } from '@/infra/documents/documents.repository';
import { ModelDocument } from '@/infra/documents/models/model-document';
import { MulterFile } from '@/infra/aws/s3/multer-file.type';

export type UploadOptions = {
    folder: string;
    bucket: string;
    namePrefix?: string;
    thumbnail?: { width: number; height: number };
};

@Injectable()
export class DocumentsService {
    constructor(
        private readonly s3: S3Service,
        private readonly repo: DocumentsRepository,
    ) {}

    async upload(file: MulterFile, options: UploadOptions): Promise<ModelDocument> {
        const ext = file.originalname.split('.').pop()?.toLowerCase() ?? 'bin';
        const prefix = options.namePrefix ?? String(Date.now());
        const originalKey = `${options.folder}/${prefix}_original.${ext}`;

        await this.s3.saveByKey(file.buffer, originalKey, file.mimetype, options.bucket);

        let thumbnailKey: string | null = null;
        if (options.thumbnail && file.mimetype.startsWith('image/')) {
            const thumbBuffer = await sharp(file.buffer)
                .resize(options.thumbnail.width, options.thumbnail.height, { fit: 'cover' })
                .jpeg({ quality: 80 })
                .toBuffer();
            thumbnailKey = `${options.folder}/${prefix}_thumbnail.jpg`;
            await this.s3.saveByKey(thumbBuffer, thumbnailKey, 'image/jpeg', options.bucket);
        }

        return this.repo.transaction((trx) =>
            this.repo.create(
                {
                    original_key: originalKey,
                    thumbnail_key: thumbnailKey,
                    mime_type: file.mimetype,
                    extension: ext,
                    size_bytes: file.size,
                },
                trx,
            ),
        );
    }
}
