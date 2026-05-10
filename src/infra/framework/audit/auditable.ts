import { SetMetadata } from '@nestjs/common';

export const AUDIT_PARAMS_KEY = 'audit_params';
export const Auditable = (event: string) => SetMetadata(AUDIT_PARAMS_KEY, event);
