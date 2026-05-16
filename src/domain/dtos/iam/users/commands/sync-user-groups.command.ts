import { IsArray, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SyncUserGroupsCommand {
    @ApiProperty({ type: [Number], description: 'IDs dos grupos a serem vinculados ao usuário' })
    @IsArray()
    @IsInt({ each: true })
    groupIds: number[];
}
