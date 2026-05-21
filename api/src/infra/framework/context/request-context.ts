import { ForbiddenException, Logger } from '@nestjs/common';
import { Audit } from '@/infra/framework/audit/audit';
import {RemoteUser} from "@/infra/framework/context/remote-user";

export class RequestContext {
    // private _iss: IssuersEnum;

    private Audit: Audit;

    constructor(
        private readonly remoteUser: RemoteUser<any>,
        private readonly traceId: string,
        private readonly uri: string,
        private readonly method: string,
        private readonly client: string //'web' | 'app' | 'script',
    ) {
        if (!traceId) {
            this.traceId = crypto.randomUUID();
        }

        this.Audit = new Audit(
            remoteUser,
            this.traceId,
            uri,
            method,
            client
        );

        // this.setIss()
    }

    // get user(): Pick<RemoteUser, 'id' | 'username' | 'permissions' | 'metadata' | 'email'> {
    //     const { id, username, permissions, metadata, email } = this.authUser;
    //
    //     return {
    //         id,
    //         username,
    //         permissions,
    //         metadata,
    //         email,
    //     };
    // }

    // get iss() {
    //     return this._iss;
    // }
    //
    // private setIss() {
    //     this._iss = this.authUser.issuer.split('/realms/')[1] as IssuersEnum;
    //
    //     if (!this._iss) {
    //         throw new ForbiddenException('Forbidden Issuer');
    //     }
    // }

    get user() {
        return this.remoteUser;
    }

    get audit() {
        return this.Audit;
    }
}
