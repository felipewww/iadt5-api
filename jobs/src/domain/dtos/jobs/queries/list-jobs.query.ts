import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { JobStatus } from '@/domain/enums/job-status.enum';

export class ListJobsQuery {
    @ApiProperty({ description: 'Tenant cujos jobs serão listados' })
    @IsString() @IsNotEmpty()
    tenantId: string;

    @ApiPropertyOptional({ enum: JobStatus, description: 'Filtrar por status' })
    @IsEnum(JobStatus) @IsOptional()
    status?: JobStatus;
}
