import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/screening',
    },
    {
      path: '/screening',
      name: 'screening',
      component: () => import('../views/ScreeningView.vue'),
    },
    {
      path: '/labeling',
      name: 'labeling',
      component: () => import('../views/LabelingView.vue'),
    },
    {
      path: '/prompt',
      name: 'prompt-editor',
      component: () => import('../views/PromptEditor.vue'),
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('../views/DashboardView.vue'),
    },
    {
      path: '/prompt-dashboard',
      name: 'prompt-dashboard',
      component: () => import('../views/PromptDashboardView.vue'),
    },
  ],
})

export default router
