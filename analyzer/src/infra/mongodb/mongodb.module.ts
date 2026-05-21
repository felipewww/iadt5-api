import { Global, Logger, Module, OnApplicationShutdown } from '@nestjs/common';
import { MongoClient } from 'mongodb';
import { config } from '@/infra/config';

export const MONGO_CLIENT = 'MONGO_CLIENT';

@Global()
@Module({
    providers: [
        {
            provide: MONGO_CLIENT,
            useFactory: async (): Promise<MongoClient> => {
                const logger = new Logger('MongoDBModule');
                const client = new MongoClient(config.mongoUri);
                await client.connect();
                logger.log(`MongoDB conectado | db=analyzer`);
                return client;
            },
        },
    ],
    exports: [MONGO_CLIENT],
})
export class MongoDBModule implements OnApplicationShutdown {
    constructor() {}

    async onApplicationShutdown(): Promise<void> {}
}
