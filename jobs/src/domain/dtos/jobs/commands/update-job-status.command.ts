import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { JobStatus } from '@/domain/enums/job-status.enum';

const UPDATABLE = [JobStatus.RUNNING, JobStatus.DONE, JobStatus.FAILED] as const;
type UpdatableStatus = typeof UPDATABLE[number];

export class UpdateJobStatusCommand {
    @ApiProperty({ enum: UPDATABLE, description: 'Novo status do job — CREATED não é permitido via PATCH' })
    @IsEnum(UPDATABLE)
    status: UpdatableStatus;

    @ApiPropertyOptional({ description: 'Mensagem de erro (apenas quando status = FAILED)' })
    @IsString() @IsOptional()
    error?: string;
}
