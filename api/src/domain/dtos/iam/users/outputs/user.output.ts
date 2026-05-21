import { ApiProperty } from '@nestjs/swagger';
import { UserReadModel } from '@/domain/read-models/iam/user.read-model';

export class UserOutput {
    @ApiProperty() id: number;
    @ApiProperty() name: string;
    @ApiProperty() username: string;
    @ApiProperty() email: string;
    @ApiProperty() active: boolean;
    @ApiProperty() created_at: Date;
    @ApiProperty() updated_at: Date;

    static from(this: void, readModel: UserReadModel): UserOutput {
        const output = new UserOutput();
        output.id = readModel.id;
        output.name = readModel.name;
        output.username = readModel.username;
        output.email = readModel.email;
        output.active = readModel.active;
        output.created_at = readModel.created_at;
        output.updated_at = readModel.updated_at;
        return output;
    }
}
