import { ConflictException } from '@nestjs/common';
import { Handler } from '@/infra/framework/handler';
import { CreateUserCommand } from '@/domain/dtos/iam/users/commands/create-user.command';
import { UserOutput } from '@/domain/dtos/iam/users/outputs/user.output';
import { IamUsersRepository } from '@/application/iam/infra/db/postgres/iam-users.repository';

export class CreateUserHandler implements Handler<CreateUserCommand, UserOutput> {
    constructor(private readonly usersRepository: IamUsersRepository) {}

    async execute(input: CreateUserCommand): Promise<UserOutput> {
        const [existingUsername, existingEmail] = await Promise.all([
            this.usersRepository.findByUsername(input.username),
            this.usersRepository.findByEmail(input.email),
        ]);

        if (existingUsername) throw new ConflictException('Username já está em uso');
        if (existingEmail) throw new ConflictException('E-mail já está em uso');

        const user = await this.usersRepository.transaction((trx) =>
            this.usersRepository.create(
                { name: input.name, username: input.username, email: input.email, password: input.password, active: true },
                trx,
            ),
        );

        return UserOutput.from(user);
    }
}
