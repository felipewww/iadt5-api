import { Injectable, UnauthorizedException } from '@nestjs/common';
import { SignJWT, jwtVerify } from 'jose';
import { Handler } from '@/infra/framework/handler';
import { RequestContext } from '@/infra/framework/context/request-context';
import { LoginOutput } from '@/domain/dtos/auth/outputs/login.output';
import { TokenPayload } from '@/domain/dtos/auth/token.payload';
import { IamUsersRepository } from '@/application/iam/infra/db/postgres/iam-users.repository';
import { AuthSecretService } from '@/infra/auth/auth-secret.service';

@Injectable()
export class RefreshHandler implements Handler<string, LoginOutput> {
    constructor(
        private readonly usersRepository: IamUsersRepository,
        private readonly authSecretService: AuthSecretService,
    ) {}

    async execute(refreshToken: string, ctx: RequestContext): Promise<LoginOutput> {
        if (!refreshToken) throw new UnauthorizedException();

        try {
            const { payload: jwt } = await jwtVerify(refreshToken, this.authSecretService.buildRefreshSecret());

            if (jwt['type'] !== 'refresh') throw new UnauthorizedException();

            const userId = Number(jwt.sub);
            const user = await this.usersRepository.findById(userId);
            if (!user || !user.active) throw new UnauthorizedException();

            const permissions = await this.usersRepository.findGroupPermissions(userId);
            const acs = user.root ? ['*'] : permissions.map((p) => `${p.module_id}:${p.action}`);

            const accessExpiry = Number(process.env.JWT_ACCESS_EXPIRY ?? 900);
            const now = Math.floor(Date.now() / 1000);

            const payload: TokenPayload = {
                sub: String(user.id),
                username: user.username,
                name: user.name,
                sessionId: jwt['sessionId'] as string,
                acs,
                root: user.root,
                type: 'access',
            };

            const accessToken = await new SignJWT({ ...payload })
                .setProtectedHeader({ alg: 'HS256' })
                .setSubject(String(user.id))
                .setIssuedAt()
                .setExpirationTime(now + accessExpiry)
                .sign(this.authSecretService.buildAccessSecret());

            return LoginOutput.from({ accessToken, accessTokenExp: now + accessExpiry, refreshToken, payload });
        } catch {
            throw new UnauthorizedException();
        }
    }
}
