import type { Knex } from 'knex';
import * as bcrypt from 'bcryptjs';

export async function seed(knex: Knex): Promise<void> {
    if (process.env.NODE_ENV !== 'development') return;

    const password = await bcrypt.hash('secret', 10);

    await knex('users')
        .insert([
            { name: 'Admin', username: 'admin', email: 'admin@dev.local', password, active: true, root: true },
            { name: 'User', username: 'user', email: 'user@dev.local', password, active: true, root: false },
        ])
        .onConflict('username')
        .ignore();
}
