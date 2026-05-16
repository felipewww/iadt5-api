import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PermissionOutput } from '@/domain/dtos/iam/permissions/outputs/permission.output';

export class SystemModuleOutput {
    @ApiProperty() id: number;
    @ApiProperty() name: string;
    @ApiPropertyOptional({ nullable: true }) description: string | null;
    @ApiProperty({ type: [PermissionOutput] }) permissions: PermissionOutput[];

    static from(model: { id: number; name: string; description: string | null; permissions: { id: number; module_id: number; action: number; name: string }[] }): SystemModuleOutput {
        const output = new SystemModuleOutput();
        output.id = model.id;
        output.name = model.name;
        output.description = model.description;
        output.permissions = model.permissions.map(PermissionOutput.from);
        return output;
    }
}
