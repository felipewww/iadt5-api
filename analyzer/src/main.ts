import 'reflect-metadata';
import 'module-alias/register';
import 'dotenv/config';

import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { SwaggerSetup } from '@/infra/framework/swagger/swagger-setup';

async function bootstrap(): Promise<void> {
    const app = await NestFactory.create(AppModule);

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            transform: true,
            transformOptions: { enableImplicitConversion: true },
        }),
    );

    SwaggerSetup(app);

    await app.listen(process.env.APP_PORT ?? 3300);
}

void bootstrap().then(() => {
    Logger.log(`Analyzer running on port ${process.env.APP_PORT ?? 3300}`);
});
