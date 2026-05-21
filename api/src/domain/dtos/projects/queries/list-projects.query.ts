import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsIn, IsInt, IsOptional, IsString } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PaginationParams } from '@/infra/db/utils/apply-filters';
import { OrderingParams } from '@/infra/db/utils/apply-ordering';

const ORDERABLE_COLS = ['name', 'customer_name', 'date_start', 'date_end', 'created_at'] as const;

export class ListProjectsQuery implements PaginationParams, OrderingParams {
    @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
    @ApiPropertyOptional()
    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    favorite?: boolean;
    @ApiPropertyOptional() @IsOptional() @IsString() customerName?: string;

    @ApiPropertyOptional() @IsOptional() @IsDateString() dateStartAfter?: Date;
    @ApiPropertyOptional() @IsOptional() @IsDateString() dateStartBefore?: Date;
    @ApiPropertyOptional() @IsOptional() @IsDateString() dateEndAfter?: Date;
    @ApiPropertyOptional() @IsOptional() @IsDateString() dateEndBefore?: Date;

    @ApiPropertyOptional({ enum: ORDERABLE_COLS })
    @IsOptional()
    @IsIn(ORDERABLE_COLS)
    orderBy?: string;

    @ApiPropertyOptional({ enum: ['asc', 'desc'] })
    @IsOptional()
    @IsIn(['asc', 'desc'])
    orderDir?: 'asc' | 'desc';

    @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() page?: number;
    @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() pageSize?: number;
}
