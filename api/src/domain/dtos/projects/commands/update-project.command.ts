import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProjectCommand {
    @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) name?: string;
    @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) customerName?: string;
    @ApiPropertyOptional() @IsOptional() @IsDateString() dateStart?: string;
    @ApiPropertyOptional() @IsOptional() @IsDateString() dateEnd?: string;
    @ApiPropertyOptional() @IsOptional() @IsString() hoverPhoto?: string;
}
