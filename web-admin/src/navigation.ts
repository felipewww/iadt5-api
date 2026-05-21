import { LayoutDashboard, Users, ShieldCheck, Shield, Settings, FolderOpen } from '@lucide/vue'
import type { Component } from 'vue'
import { SysModules } from '@/domain/permissions/sys-modules'

export interface NavItem {
    label: string
    to?: string
    icon: Component
    module?: number
    children?: NavItem[]
}

export const navItems: NavItem[] = [
    { label: 'Dashboard', to: '/', icon: LayoutDashboard },
    { label: 'Projetos', to: '/projects', icon: FolderOpen, module: SysModules.projects },
    {
        label: 'Configurações',
        icon: Settings,
        children: [
            {
                label: 'IAM',
                icon: Shield,
                module: SysModules.iam,
                children: [
                    { label: 'Usuários', to: '/iam/users', icon: Users },
                    { label: 'Grupos', to: '/iam/groups', icon: ShieldCheck },
                ],
            },
        ],
    },
]
