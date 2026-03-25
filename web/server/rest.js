import { registerMetrics } from './metrics';
import { WebApp } from 'meteor/webapp';

registerMetrics({
  path: '/api/metrics',
  useAuth: process.env.USE_METRICS_AUTH,
});

WebApp.handlers.get('/api', (req, res) => {
  res.set('Content-type', 'application/json');
  res.status(200).send(JSON.stringify({ status: 'success' }));
});
