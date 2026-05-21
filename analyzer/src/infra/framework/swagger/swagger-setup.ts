import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { INestApplication } from '@nestjs/common';

export function SwaggerSetup(app: INestApplication): void {
    const config = new DocumentBuilder()
        .setTitle('Analyzer Service')
        .setDescription('Análise de qualidade de arquitetura de software')
        .setVersion('1.0.0')
        .build();

    const document = SwaggerModule.createDocument(app, config);

    (document as any)['x-tagGroups'] = [
        { name: 'Analysis', tags: ['analysis'] },
    ];

    SwaggerModule.setup('api/docs', app, document);

    app.use(
        '/api/reference',
        apiReference({
            content: document,
            theme: 'moon',
            darkMode: true,
            layout: 'modern',
        }),
    );
}
