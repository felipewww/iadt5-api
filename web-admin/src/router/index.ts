import {createRouter, createWebHistory} from 'vue-router'
import {useAuthStore} from '@/stores/auth'

declare module 'vue-router' {
    interface RouteMeta {
        layout?: 'public' | 'dashboard'
        requiresAuth?: boolean
    }
}

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/login',
            name: 'login',
            component: () => import('@/views/auth/LoginView.vue'),
            meta: {layout: 'public'},
        },
        {
            path: '/',
            name: 'home',
            component: () => import('@/views/dashboard/HomeView.vue'),
            meta: {layout: 'dashboard', requiresAuth: true},
        },
        {
            path: '/iam/users',
            name: 'iam-users',
            component: () => import('@/views/iam/UsersView.vue'),
            meta: {layout: 'dashboard', requiresAuth: true},
        },
        {
            path: '/iam/groups',
            name: 'iam-groups',
            component: () => import('@/views/iam/GroupsView.vue'),
            meta: {layout: 'dashboard', requiresAuth: true},
        },
        {
            path: '/projects',
            name: 'projects',
            component: () => import('@/views/projects/ProjectsView.vue'),
            meta: { layout: 'dashboard', requiresAuth: true },
        },
        {
            path: '/projects/:id',
            name: 'projects-form',
            component: () => import('@/views/projects/ProjectFormView.vue'),
            meta: { layout: 'dashboard', requiresAuth: true },
        },
        {
            path: '/iam/users/:id',
            name: 'iam-user-form',
            component: () => import('@/views/iam/UserFormView.vue'),
            meta: {layout: 'dashboard', requiresAuth: true},
        },
        {
            path: '/iam/groups/:id',
            name: 'iam-group-form',
            component: () => import('@/views/iam/GroupFormView.vue'),
            meta: {layout: 'dashboard', requiresAuth: true},
        },
    ],
})

router.beforeEach((to) => {
    const auth = useAuthStore()
    if (to.meta.requiresAuth && !auth.verifyAuth()) {
        return { name: 'login' }
    }
})

export default router
