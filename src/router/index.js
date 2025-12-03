import { createRouter, createWebHistory } from 'vue-router';
import WorkloadView from '@/views/WorkloadView.vue';
import EnvironmentView from '@/views/EnvironmentView.vue';
import TopologyView from '@/views/TopologyView.vue';
import ResultsView from '@/views/ResultsView.vue';

const routes = [
  {
    path: '/',
    redirect: '/workload'
  },
  {
    path: '/workload',
    name: 'Workload',
    component: WorkloadView
  },
  {
    path: '/environment',
    name: 'Environment',
    component: EnvironmentView
  },
  {
    path: '/topology',
    name: 'Topology',
    component: TopologyView
  },
  {
    path: '/results',
    name: 'Results',
    component: ResultsView
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
