import { Injectable, UnauthorizedException } from '@nestjs/common';
import { SignJWT } from 'jose';
import * as bcrypt from 'bcryptjs';
import { Handler } from '@/infra/framework/handler';
import { LoginCommand } from '@/domain/dtos/auth/commands/login.command';
import { LoginOutput } from '@/domain/dtos/auth/outputs/login.output';
import { IamUsersRepository } from '@/application/iam/infra/db/postgres/iam-users.repository';

@Injectable()
export class LoginHandler implements Handler<LoginCommand, LoginOutput> {
    constructor(private readonly usersRepository: IamUsersRepository) {}

    async execute(input: LoginCommand): Promise<LoginOutput> {
        const user = await this.usersRepository.findByUsername(input.username);
        if (!user) throw new UnauthorizedException('Credenciais inválidas');

        const valid = await bcrypt.compare(input.password, user.password);
        if (!valid) throw new UnauthorizedException('Credenciais inválidas');

        const groups = await this.usersRepository.findGroups(user.id);
        const groupIds = groups.map((g) => g.id);

        const secret = new TextEncoder().encode(process.env.JWT_SECRET);
        const token = await new SignJWT({ username: user.username, name: user.name, groups: groupIds, root: user.root })
            .setProtectedHeader({ alg: 'HS256' })
            .setSubject(String(user.id))
            .setIssuedAt()
            .setExpirationTime(process.env.JWT_EXPIRY ?? '1h')
            .sign(secret);

        return LoginOutput.from(token);
    }
}
