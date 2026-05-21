export type TokenUser = {
    sub: string;
    username: string;
    name: string;
    acs: string[];
    root: boolean;
    sessionId: string;
}

export type LoginOutput = {
    accessToken: string;
    accessTokenExp: number;
    refreshToken: string;
    payload: TokenUser;
}
