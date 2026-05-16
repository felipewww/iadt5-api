import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GroupReadModel } from '@/domain/read-models/iam/group.read-model';

export class GroupOutput {
    @ApiProperty() id: number;
    @ApiProperty() name: string;
    @ApiPropertyOptional({ nullable: true }) description: string | null;
    @ApiProperty() created_at: Date;
    @ApiProperty() updated_at: Date;

    static from(this: void, readModel: GroupReadModel): GroupOutput {
        const output = new GroupOutput();
        output.id = readModel.id;
        output.name = readModel.name;
        output.description = readModel.description;
        output.created_at = readModel.created_at;
        output.updated_at = readModel.updated_at;
        return output;
    }
}
