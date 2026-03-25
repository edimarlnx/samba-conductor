import React from 'react';
import { useNavigate } from 'react-router-dom';
import { RoutePaths } from '../general/RoutePaths';
import { Button } from '../components/Button';

export function Status() {
  const navigate = useNavigate();

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-4">Server Status</h1>
      <p className="text-gray-400">Service monitoring coming soon.</p>
      <Button
        secondary
        onClick={() => navigate(RoutePaths.DASHBOARD)}
        className="mt-6"
      >
        Back to Dashboard
      </Button>
    </div>
  );
}
