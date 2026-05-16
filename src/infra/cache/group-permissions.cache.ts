import { Injectable } from '@nestjs/common';

@Injectable()
export class GroupPermissionsCache {
    private readonly map = new Map<number, Set<string>>();

    set(groupId: number, permissionKeys: string[]): void {
        this.map.set(groupId, new Set(permissionKeys));
    }

    delete(groupId: number): void {
        this.map.delete(groupId);
    }

    hasPermission(groupIds: number[], moduleId: number, action: number): boolean {
        const key = `${moduleId}:${action}`;
        return groupIds.some((gId) => this.map.get(gId)?.has(key) ?? false);
    }
}
