import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PermissionOutput } from '@/domain/dtos/iam/permissions/outputs/permission.output';
import { SystemModuleReadModel } from '@/domain/read-models/iam/system-module.read-model';

export class SystemModuleOutput {
    @ApiProperty() id: number;
    @ApiProperty() name: string;
    @ApiPropertyOptional({ nullable: true }) description: string | null;
    @ApiProperty({ type: [PermissionOutput] }) permissions: PermissionOutput[];

    static from(this: void, readModel: SystemModuleReadModel): SystemModuleOutput {
        const output = new SystemModuleOutput();
        output.id = readModel.id;
        output.name = readModel.name;
        output.description = readModel.description;
        output.permissions = readModel.permissions.map(PermissionOutput.from);
        return output;
    }
}
