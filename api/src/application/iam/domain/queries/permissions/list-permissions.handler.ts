import { Injectable } from '@nestjs/common';
import { RequestContext } from '@/infra/framework/context/request-context';
import { PERMISSIONS_CONFIG } from '@/domain/permissions/permissions.config';

@Injectable()
export class ListPermissionsHandler {
    execute(ctx: RequestContext) {
        return PERMISSIONS_CONFIG;
    }
}
