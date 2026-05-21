import { ApiProperty } from '@nestjs/swagger';
import { TokenPayload } from '@/domain/dtos/auth/token.payload';

export class LoginOutput {
    @ApiProperty() accessToken: string;
    @ApiProperty() accessTokenExp: number;
    @ApiProperty() refreshToken: string;
    @ApiProperty() payload: Omit<TokenPayload, 'iat' | 'exp' | 'type'>;

    static from(
        this: void,
        data: { accessToken: string; accessTokenExp: number; refreshToken: string; payload: TokenPayload },
    ): LoginOutput {
        const output = new LoginOutput();
        output.accessToken = data.accessToken;
        output.accessTokenExp = data.accessTokenExp;
        output.refreshToken = data.refreshToken;
        const { iat: _iat, exp: _exp, type: _type, ...payloadFields } = data.payload;
        output.payload = payloadFields;
        return output;
    }
}
