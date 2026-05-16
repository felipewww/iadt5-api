import { ModelGroup } from '@/application/iam/infra/db/postgres/models/model-group';

export type GroupReadModel = ModelGroup & {
    // campos de JOINs futuros entram aqui
    // ex: permission_count?: number
}
