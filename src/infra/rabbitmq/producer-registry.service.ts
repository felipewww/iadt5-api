import { Injectable } from '@nestjs/common';
import { Producer } from '@/infra/framework/rabbitmq/Producer';

@Injectable()
export class ProducerRegistry {
    private readonly producers = new Map<string, Producer<any>>();

    register(name: string, producer: Producer<any>): void {
        this.producers.set(name, producer);
    }

    get<T>(name: string): Producer<T> | undefined {
        return this.producers.get(name) as Producer<T> | undefined;
    }
}
