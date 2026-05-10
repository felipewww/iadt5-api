import {NestFactory} from '@nestjs/core';
import {AppModule} from './app.module';
import {Logger, ValidationPipe} from "@nestjs/common";
import { SwaggerSetup } from '@/infra/framework/swagger/swagger-setup';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            transform: true,
            transformOptions: {
                enableImplicitConversion: true,
            },
            forbidNonWhitelisted: false, // todo - voltar para TRUE após converter a V2
        }),
    );

    SwaggerSetup(app)

    await app.listen(process.env.APP_PORT ?? 3000);
}

void bootstrap()
    .then(() => {
        Logger.log(`Server is running on port ${process.env.APP_PORT}`)
    });
