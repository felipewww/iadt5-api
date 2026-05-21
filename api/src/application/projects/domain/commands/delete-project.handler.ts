import { Injectable, NotFoundException } from '@nestjs/common';
import { ProjectsRepository } from '@/application/projects/infra/db/postgres/projects.repository';

@Injectable()
export class DeleteProjectHandler {
    constructor(private readonly repository: ProjectsRepository) {}

    async execute(id: number): Promise<void> {
        const existing = await this.repository.findById(id);
        if (!existing) throw new NotFoundException('Projeto não encontrado');

        await this.repository.transaction((trx) => this.repository.delete(id, trx));
    }
}
