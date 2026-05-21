import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ReplyAnalysisCommand {
    @ApiProperty({ description: 'Resposta do usuário às dúvidas levantadas pela IA' })
    @IsString()
    @IsNotEmpty()
    answer!: string;
}
