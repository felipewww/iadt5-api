export type RemoteUser<META extends Record<any, any> = Record<string, any>> = {
    id: number;
    username: string;
    name: string;
    groups: number[];
    metadata: META;
}
