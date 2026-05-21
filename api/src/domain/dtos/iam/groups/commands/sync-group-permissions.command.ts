import { ArrayNotEmpty, IsArray, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TransformIds } from '@/infra/hash-id/transform-id.decorator';

export class SyncGroupPermissionsCommand {
    @ApiProperty({ type: [String], description: 'Hash tokens das permissions a serem vinculadas ao grupo' })
    @TransformIds()
    @IsArray()
    @ArrayNotEmpty()
    @IsInt({ each: true })
    permissionIds: number[];
}
