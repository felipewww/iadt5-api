export type TokenPayload = {
    sub: string;
    username: string;
    name: string;
    sessionId: string;
    acs: string[];
    root: boolean;
    type: 'access' | 'refresh';
    iat?: number;
    exp?: number;
};
