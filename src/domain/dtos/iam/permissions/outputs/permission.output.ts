import { ApiProperty } from '@nestjs/swagger';

export class PermissionOutput {
    @ApiProperty() id: number;
    @ApiProperty() module_id: number;
    @ApiProperty() action: number;
    @ApiProperty() name: string;

    static from(model: { id: number; module_id: number; action: number; name: string }): PermissionOutput {
        const output = new PermissionOutput();
        output.id = model.id;
        output.module_id = model.module_id;
        output.action = model.action;
        output.name = model.name;
        return output;
    }
}
