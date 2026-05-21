import { ApiProperty } from '@nestjs/swagger';

export class NotificationTokenOutput {
    @ApiProperty() token: string;

    static from(this: void, token: string): NotificationTokenOutput {
        const o = new NotificationTokenOutput();
        o.token = token;
        return o;
    }
}
