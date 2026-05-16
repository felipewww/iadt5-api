import { ModelUser } from '@/application/iam/infra/db/postgres/models/model-user';

export type UserReadModel = ModelUser & {
    // campos de JOINs futuros entram aqui
    // ex: group_count?: number
}
