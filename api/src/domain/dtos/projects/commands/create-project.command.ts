import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateProjectCommand {
    @ApiProperty() @IsString() @MaxLength(255) name: string;
    @ApiProperty() @IsString() @MaxLength(255) customerName: string;
    @ApiProperty() @IsDateString() dateStart: string;
    @ApiProperty() @IsDateString() dateEnd: string;
    @ApiPropertyOptional() @IsOptional() @IsString() hoverPhoto?: string;
}
