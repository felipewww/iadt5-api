import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateJobCommand {
    @ApiProperty({ description: 'Identificador do tenant que originou o job' })
    @IsString() @IsNotEmpty()
    tenantId: string;

    @ApiPropertyOptional({ description: 'ID do usuário dono do job. Ausente = job global do tenant' })
    @IsString() @IsOptional()
    userId?: string;

    @ApiProperty({ description: 'Tipo do job — definido pelo worker que o processa (ex: pdf-analysis, video-transcode)' })
    @IsString() @IsNotEmpty()
    type: string;

    @ApiPropertyOptional({ description: 'Dados iniciais necessários para o worker executar o job' })
    @IsObject() @IsOptional()
    payload?: Record<string, unknown>;
}
