import { Module } from '@nestjs/common';
import { AwsModule } from '@/infra/aws/aws.module';
import { DocumentsRepository } from '@/infra/documents/documents.repository';
import { DocumentsService } from '@/infra/documents/documents.service';

@Module({
    imports: [AwsModule],
    providers: [DocumentsRepository, DocumentsService],
    exports: [DocumentsService],
})
export class DocumentsModule {}
