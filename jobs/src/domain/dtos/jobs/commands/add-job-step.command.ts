import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class AddJobStepCommand {
    @ApiProperty({ description: 'Identificador do step (ex: ocr-extract, analyzer-result)' })
    @IsString()
    name: string;

    @ApiPropertyOptional({ description: 'Dados produzidos pelo step' })
    @IsOptional()
    data?: unknown;

    @ApiProperty({ description: 'Status do step: 1 = concluído' })
    @IsInt()
    status: number;
}
