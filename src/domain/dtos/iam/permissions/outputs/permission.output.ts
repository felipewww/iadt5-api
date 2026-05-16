import { ApiProperty } from '@nestjs/swagger';
import { PermissionReadModel } from '@/domain/read-models/iam/system-module.read-model';

export class PermissionOutput {
    @ApiProperty() id: number;
    @ApiProperty() module_id: number;
    @ApiProperty() action: number;
    @ApiProperty() name: string;

    static from(this: void, readModel: PermissionReadModel): PermissionOutput {
        const output = new PermissionOutput();
        output.id = readModel.id;
        output.module_id = readModel.module_id;
        output.action = readModel.action;
        output.name = readModel.name;
        return output;
    }
}
