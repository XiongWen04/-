import { createRouter, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

/**
 * 路由配置表
 * 采用嵌套路由结构：根路径 '/' 加载 AppLayout 骨架布局组件，
 * 所有页面作为子路由在 layout 的 <router-view /> 中渲染
 */
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
        meta: { title: '首页' } // 首页概览：显示本月收支卡片、快捷记账入口、最近记录
      },
      {
        path: 'add',
        name: 'Add',
        component: () => import('@/views/AddView.vue'),
        meta: { title: '新增记录' } // 收支一体表单：支出/收入切换，级联分类，日期，支付方式/来源
      },
      {
        path: 'list',
        name: 'List',
        component: () => import('@/views/ListView.vue'),
        meta: { title: '花销列表' } // 收支明细列表：按月分组，支持类型/日期/分类筛选和分页
      },
      {
        path: 'stats',
        name: 'Stats',
        component: () => import('@/views/StatsView.vue'),
        meta: { title: '数据统计' } // 统计概览：双折线图、饼图、年度柱状对比
      },
      {
        path: 'categories',
        name: 'Categories',
        component: () => import('@/views/CategoriesView.vue'),
        meta: { title: '分类管理' } // 分类管理：树形展示一级/二级分类，支持添加和删除二级分类
      },
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('@/views/SettingsView.vue'),
        meta: { title: '设置' } // 应用设置：版本信息、数据库备份到文档目录
      },
      {
        path: 'snake',
        name: 'Snake',
        component: () => import('@/views/SnakeGame.vue'),
        meta: { title: '贪吃蛇' } // 彩蛋功能：贪吃蛇小游戏
      }
    ]
  }
]

/**
 * 创建 Vue Router 实例
 * 使用 Hash 模式（createWebHashHistory）而非 History 模式的原因：
 * 1. Electron 基于 file:// 协议加载页面，History 模式要求服务端路由支持
 * 2. Hash 模式无需服务端配置，兼容 Electron 静态文件加载方式
 * 3. 避免打包后路由刷新 404 问题
 */
const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
