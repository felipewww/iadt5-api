export type RemoteUser<META extends Record<any, any> = Record<string, any>> = {
    id: number;
    username: string;
    name: string;
    acs: string[];
    root: boolean;
    metadata: META;
}
