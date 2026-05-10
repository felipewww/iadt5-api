import { SetMetadata } from '@nestjs/common';
import { SysModules } from '@/domain/permissions/sys-modules';

export const ROLES_KEY = 'MODULE_GUARD';
export const Roles = (
    module: SysModules,
    permissions: number[]
) => SetMetadata(ROLES_KEY, [module, permissions]);
