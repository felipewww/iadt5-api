import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { INestApplication } from '@nestjs/common';

export function SwaggerSetup(app: INestApplication) {
    const config = new DocumentBuilder()
        .setTitle('MUSA Admin API.')
        .setDescription('API documentation for MUSA Admin')
        .setVersion('1.0')
        .addBearerAuth(
            {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                name: 'Authorization',
                description: 'Enter JWT token',
                in: 'header',
            },
            'access-token',
        )
        .build();

    const document = SwaggerModule.createDocument(app, config);


    (document as any)['x-tagGroups'] = [
        { name: 'OPS',        tags: ['Coletas', 'Rotas', 'Documentos'] },
        { name: 'Agreements', tags: ['Ordens', 'Contratos', 'Serviços - Transporte', 'Serviços - Recepção'] },
        { name: 'Registry',   tags: ['Materiais', 'Embalagens', 'Tratamentos'] },
        { name: 'Engine',     tags: ['Coletas (Engine)'] },
    ];

    SwaggerModule.setup('api/docs', app, document);

    app.use('/api/reference', apiReference({
        content: document,
        theme: 'default',
        darkMode: false,
        layout: 'modern',
        hideModels: false,
        customCss: `
      :root { --scalar-font: 'Inter', system-ui, sans-serif; }
      .sidebar { background: #f8f9fa; }
    `,
    }));

}
