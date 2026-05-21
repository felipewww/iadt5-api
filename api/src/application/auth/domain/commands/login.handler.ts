import { Injectable, UnauthorizedException } from '@nestjs/common';
import { SignJWT } from 'jose';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { Handler } from '@/infra/framework/handler';
import { RequestContext } from '@/infra/framework/context/request-context';
import { LoginCommand } from '@/domain/dtos/auth/commands/login.command';
import { LoginOutput } from '@/domain/dtos/auth/outputs/login.output';
import { TokenPayload } from '@/domain/dtos/auth/token.payload';
import { IamUsersRepository } from '@/application/iam/infra/db/postgres/iam-users.repository';
import { AuthSecretService } from '@/infra/auth/auth-secret.service';

@Injectable()
export class LoginHandler implements Handler<LoginCommand, LoginOutput> {
    constructor(
        private readonly usersRepository: IamUsersRepository,
        private readonly authSecretService: AuthSecretService,
    ) {}

    async execute(input: LoginCommand, ctx: RequestContext): Promise<LoginOutput> {
        const user = await this.usersRepository.findByUsername(input.username);
        if (!user) throw new UnauthorizedException('Credenciais inválidas');

        const valid = await bcrypt.compare(input.password, user.password);
        if (!valid) throw new UnauthorizedException('Credenciais inválidas');

        if (!user.active) throw new UnauthorizedException('Usuário inativo');

        const permissions = await this.usersRepository.findGroupPermissions(user.id);
        const acs = user.root ? ['*'] : permissions.map((p) => `${p.module_id}:${p.action}`);

        const sessionId = randomUUID();
        const accessExpiry = Number(process.env.JWT_ACCESS_EXPIRY ?? 900);
        const refreshExpiry = Number(process.env.JWT_REFRESH_EXPIRY ?? 604800);
        const now = Math.floor(Date.now() / 1000);

        const basePayload: TokenPayload = {
            sub: String(user.id),
            username: user.username,
            name: user.name,
            sessionId,
            acs,
            root: user.root,
            type: 'access',
        };

        const accessToken = await new SignJWT({ ...basePayload })
            .setProtectedHeader({ alg: 'HS256' })
            .setSubject(String(user.id))
            .setIssuedAt()
            .setExpirationTime(now + accessExpiry)
            .sign(this.authSecretService.buildAccessSecret());

        const refreshToken = await new SignJWT({ ...basePayload, type: 'refresh' })
            .setProtectedHeader({ alg: 'HS256' })
            .setSubject(String(user.id))
            .setIssuedAt()
            .setExpirationTime(now + refreshExpiry)
            .sign(this.authSecretService.buildRefreshSecret());

        return LoginOutput.from({ accessToken, accessTokenExp: now + accessExpiry, refreshToken, payload: basePayload });
    }
}
