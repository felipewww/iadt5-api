import { ModelPermission } from '@/application/iam/infra/db/postgres/models/model-permission';

export type ModelSystemModule = {
    id: number;
    name: string;
    description: string | null;
    permissions?: ModelPermission[];
}
