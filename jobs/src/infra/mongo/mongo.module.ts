import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
    imports: [
        MongooseModule.forRoot(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000,
        }),
    ],
    exports: [MongooseModule],
})
export class MongoModule {}
