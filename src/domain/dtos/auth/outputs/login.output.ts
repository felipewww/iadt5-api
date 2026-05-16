import { ApiProperty } from '@nestjs/swagger';

export class LoginOutput {
    @ApiProperty() access_token: string;
    @ApiProperty() expires_in: number;

    static from(this: void, token: string): LoginOutput {
        const output = new LoginOutput();
        output.access_token = token;
        output.expires_in = 3600;
        return output;
    }
}
