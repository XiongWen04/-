import { createRouter, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('@/components/AppLayout.vue'),
    redirect: '/home',
    children: [
      {
        path: 'home',
        name: 'Home',
        component: () => import('@/views/HomeView.vue'),
        meta: { title: '首页' }
      },
      {
        path: 'add',
        name: 'Add',
        component: () => import('@/views/AddView.vue'),
        meta: { title: '新增记录' }
      },
      {
        path: 'list',
        name: 'List',
        component: () => import('@/views/ListView.vue'),
        meta: { title: '花销列表' }
      },
      {
        path: 'stats',
        name: 'Stats',
        component: () => import('@/views/StatsView.vue'),
        meta: { title: '数据统计' }
      },
      {
        path: 'categories',
        name: 'Categories',
        component: () => import('@/views/CategoriesView.vue'),
        meta: { title: '分类管理' }
      },
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('@/views/SettingsView.vue'),
        meta: { title: '设置' }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
