export type RemoteUser<META extends Record<any, any>> = {
    id: string;
    username: string;
    name: string;
    issuer: string;
    permissionGroups: string[];
    metadata: META;
}
