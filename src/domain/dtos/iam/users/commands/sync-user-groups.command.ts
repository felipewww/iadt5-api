import { IsArray, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TransformIds } from '@/infra/hash-id/transform-id.decorator';

export class SyncUserGroupsCommand {
    @ApiProperty({ type: [String], description: 'Hash tokens dos grupos a serem vinculados ao usuário' })
    @TransformIds()
    @IsArray()
    @IsInt({ each: true })
    groupIds: number[];
}
