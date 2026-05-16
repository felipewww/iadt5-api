import { ApiProperty } from '@nestjs/swagger';

export class UserOutput {
    @ApiProperty() id: number;
    @ApiProperty() name: string;
    @ApiProperty() username: string;
    @ApiProperty() email: string;
    @ApiProperty() active: boolean;
    @ApiProperty() created_at: Date;
    @ApiProperty() updated_at: Date;

    static from(model: { id: number; name: string; username: string; email: string; active: boolean; created_at: Date; updated_at: Date }): UserOutput {
        const output = new UserOutput();
        output.id = model.id;
        output.name = model.name;
        output.username = model.username;
        output.email = model.email;
        output.active = model.active;
        output.created_at = model.created_at;
        output.updated_at = model.updated_at;
        return output;
    }
}
