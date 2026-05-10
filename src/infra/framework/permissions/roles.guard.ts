import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SysModules } from '@/domain/permissions/sys-modules';
import { ROLES_KEY } from '@/infra/framework/permissions/roles.decorator';
import { getRequestAdapter } from '@/infra/framework/http/get-request.adapter';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        const metadata = this.reflector.getAllAndOverride<{
            module: SysModules;
            permissions: number[];
        }>(ROLES_KEY, [context.getHandler(), context.getClass()]);

        if (!metadata) {
            return true;
        }

        const req = getRequestAdapter(context);
        const requestContext = req.context;

        // if (requestContext.payload.type === UserTypeEnum.ADMIN) {
        //     return true;
        // }

        const moduleId = metadata[0] as number;
        const permissionsRequired = metadata[1] as Array<number>;

        const reqs = [];
        for (const permission of permissionsRequired) {
            const perm = `${moduleId}:${permission}`;

            // if (requestContext.payload.acs.indexOf(perm) < 0) {
            //     return false;
            // }
        }

        return true;
    }
}
