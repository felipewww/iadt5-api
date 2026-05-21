import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { INestApplication } from '@nestjs/common';

export function SwaggerSetup(app: INestApplication) {
    const config = new DocumentBuilder()
        .setTitle('cognite-jobs')
        .setDescription('Serviço de gerenciamento de jobs assíncronos')
        .setVersion('1.0.0')
        .build();

    const document = SwaggerModule.createDocument(app, config);

    (document as any)['x-tagGroups'] = [
        { name: 'Jobs', tags: ['Jobs'] },
    ];

    SwaggerModule.setup('api/docs', app, document);

    app.use('/api/reference', apiReference({
        content: document,
        theme: 'moon',
        darkMode: true,
        layout: 'modern',
        hideModels: false,
        customCss: `
            :root { --scalar-font: 'Inter', system-ui, sans-serif; }
        `,
    }));
}
