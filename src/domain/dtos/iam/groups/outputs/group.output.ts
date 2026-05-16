import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GroupOutput {
    @ApiProperty() id: number;
    @ApiProperty() name: string;
    @ApiPropertyOptional({ nullable: true }) description: string | null;
    @ApiProperty() created_at: Date;
    @ApiProperty() updated_at: Date;

    static from(model: { id: number; name: string; description: string | null; created_at: Date; updated_at: Date }): GroupOutput {
        const output = new GroupOutput();
        output.id = model.id;
        output.name = model.name;
        output.description = model.description;
        output.created_at = model.created_at;
        output.updated_at = model.updated_at;
        return output;
    }
}
