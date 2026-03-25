import React, { Suspense } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Router } from './Router';
import { AlertProvider, Alert } from 'meteor/quave:alert-react-tailwind';
import { Loading } from '../components/Loading';
import { MyAlert } from '../components/MyAlert';

export function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loading />}>
        <AlertProvider>
          <Alert Component={MyAlert} />
          <Router />
        </AlertProvider>
      </Suspense>
    </BrowserRouter>
  );
}
