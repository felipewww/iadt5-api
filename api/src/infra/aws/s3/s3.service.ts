import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

type ContentType = string;

export class S3Service {
    private client = new S3Client();

    private bucket: string = process.env.AWS_BUCKET_NAME;
    private region: string = process.env.AWS_REGION;

    public async save(
        data: Buffer,
        destinationFolder: string,
        filename: string,
        contentType: ContentType,
    ) {
        const key = `${destinationFolder}${filename}`;
        await this.saveByKey(data, key, contentType);

        return this.getPublicUrlByKey(key);
    }

    public async saveByKey(
        data: Buffer,
        key: string,
        contentType: ContentType,
        bucket: string = this.bucket,
    ): Promise<string> {
        const parallelUploads3 = new Upload({
            client: this.client,
            params: {
                Bucket: bucket,
                Body: data,
                Key: key,
                ContentType: contentType,
            },
        });

        await parallelUploads3.done();

        return key;
    }

    public async createPresignedGetUrl(
        key: string,
        bucket: string,
        expiresInSeconds: number = 3600,
    ): Promise<string> {
        const command = new GetObjectCommand({
            Bucket: bucket,
            Key: key,
        });

        return getSignedUrl(this.client, command, {
            expiresIn: expiresInSeconds,
        });
    }

    public getPublicUrlByKey(key: string): string {
        return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
    }

    public resolveKeyFromPath(keyOrUrl: string): string {
        const normalized = keyOrUrl.trim();

        if (!normalized) {
            return normalized;
        }

        if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
            return normalized;
        }

        const url = new URL(normalized);
        const pathWithoutLeadingSlash = url.pathname.replace(/^\/+/, '');

        try {
            return decodeURIComponent(pathWithoutLeadingSlash);
        } catch {
            return pathWithoutLeadingSlash;
        }
    }

}
