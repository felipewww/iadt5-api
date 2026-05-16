import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { HashIdService } from '@/infra/hash-id/hash-id.service';

@Injectable()
export class HashIdPipe implements PipeTransform<string, number> {
    constructor(private readonly hashId: HashIdService) {}

    transform(value: string): number {
        try {
            return this.hashId.decode(value);
        } catch {
            throw new BadRequestException('ID inválido');
        }
    }
}
