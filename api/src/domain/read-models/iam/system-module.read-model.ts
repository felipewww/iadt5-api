export type PermissionReadModel = {
    id: number;
    module_id: number;
    action: number;
    name: string;
}

export type SystemModuleReadModel = {
    id: number;
    name: string;
    description: string | null;
    permissions: PermissionReadModel[];
}
