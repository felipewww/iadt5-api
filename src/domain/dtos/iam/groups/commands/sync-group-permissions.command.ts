import { ArrayNotEmpty, IsArray, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SyncGroupPermissionsCommand {
    @ApiProperty({ type: [Number], description: 'IDs das permissions a serem vinculadas ao grupo' })
    @IsArray()
    @ArrayNotEmpty()
    @IsInt({ each: true })
    permissionIds: number[];
}
