import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { SwaggerSetup } from '@/infra/framework/swagger/swagger-setup';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    app.enableCors();

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            transform: true,
            transformOptions: {
                enableImplicitConversion: true,
            },
        }),
    );

    SwaggerSetup(app);

    await app.listen(process.env.APP_PORT ?? 3100);
}

void bootstrap().then(() => {
    Logger.log(`cognite-jobs running on port ${process.env.APP_PORT ?? 3100}`);
});
