import {NestFactory} from '@nestjs/core';
import {AppModule} from './app.module';
import {Logger, ValidationPipe} from "@nestjs/common";
import { SwaggerSetup } from '@/infra/framework/swagger/swagger-setup';
import * as bcrypt from 'bcryptjs';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    const corsOrigin = process.env.CORS_ORIGIN ?? '*';
    app.enableCors({
        origin: corsOrigin === '*' ? '*' : corsOrigin.split(',').map((o) => o.trim()),
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        credentials: corsOrigin !== '*',
    });

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            transform: true,
            transformOptions: {
                enableImplicitConversion: true,
            },
            // forbidNonWhitelisted: false, // todo - voltar para TRUE após converter a V2
        }),
    );

    SwaggerSetup(app)

    await app.listen(process.env.APP_PORT ?? 3000);
}

void bootstrap()
    .then(() => {
        Logger.log(`Server is running on port ${process.env.APP_PORT}`)
        bcrypt.hash('123123', 10)
            .then(console.log)

    });
