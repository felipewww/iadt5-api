import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SysModules } from '@/domain/permissions/sys-modules';
import { ROLES_KEY } from '@/infra/framework/permissions/roles.decorator';
import { getRequestAdapter } from '@/infra/framework/http/get-request.adapter';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        const metadata = this.reflector.getAllAndOverride<[SysModules, number[]]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!metadata) return true;

        const req = getRequestAdapter(context);
        if (req.context.user.root) return true;

        const [moduleId, permissionsRequired] = metadata;
        const { acs } = req.context.user;

        for (const action of permissionsRequired) {
            if (!acs.includes(`${moduleId}:${action}`)) {
                throw new ForbiddenException();
            }
        }

        return true;
    }
}
