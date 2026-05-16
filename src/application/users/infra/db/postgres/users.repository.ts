import {PgRepository} from "@/infra/db/postgres/pg-repository";

export class UsersRepository extends PgRepository {
    tableName = 'users';

    async findByUsername(username: string) {

    }
}
