export type TenantSecretChangeMessage = {
  tenantId: number;
  secretAccess: string;
  secretRefresh: string;
}
