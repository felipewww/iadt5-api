import { Transform } from 'class-transformer';
import { HashIdService } from '@/infra/hash-id/hash-id.service';

const hashId = new HashIdService();

export const TransformId = () =>
    Transform(({ value }: { value: unknown }) =>
        typeof value === 'string' ? hashId.decode(value) : value,
    );

export const TransformIds = () =>
    Transform(({ value }: { value: unknown }) =>
        Array.isArray(value) ? (value as string[]).map((v) => hashId.decode(v)) : value,
    );
