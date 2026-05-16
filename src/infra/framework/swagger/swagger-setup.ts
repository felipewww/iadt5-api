import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { INestApplication } from '@nestjs/common';
import { manifest } from '@/infra/manifest/manifest';

export function SwaggerSetup(app: INestApplication) {
    const config = new DocumentBuilder()
        .setTitle(`${manifest.tenantName} — ${manifest.projectName}`)
        .setDescription('API documentation')
        .setVersion(manifest.version)
        .addBearerAuth(
            {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                name: 'Authorization',
                description: 'JWT token obtido via POST /auth/login',
                in: 'header',
            },
            'access-token',
        )
        .build();

    const document = SwaggerModule.createDocument(app, config);

    (document as any)['x-tagGroups'] = [
        { name: 'Auth', tags: ['Auth'] },
        { name: 'IAM',  tags: ['IAM — Users', 'IAM — Groups', 'IAM — Permissions'] },
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
