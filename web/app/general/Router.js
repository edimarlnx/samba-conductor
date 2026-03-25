import React from 'react';
import { Route, Routes } from 'react-router-dom';

import { RoutePaths } from './RoutePaths';
import { Login } from '../auth/Login';
import { Dashboard } from '../dashboard/Dashboard';
import { Users } from '../users/Users';
import { UserForm } from '../users/UserForm';
import { Groups } from '../groups/Groups';
import { GroupForm } from '../groups/GroupForm';
import { Domain } from '../domain/Domain';
import { NotFound } from './NotFound';
import { AnonymousLayout } from '../layouts/AnonymousLayout';
import { LoggedLayout } from '../layouts/LoggedLayout';
import { AdminLayout } from '../layouts/AdminLayout';

function AdminPage({ children }) {
  return (
    <LoggedLayout>
      <AdminLayout>{children}</AdminLayout>
    </LoggedLayout>
  );
}

export function Router() {
  return (
    <Routes>
      <Route
        path={RoutePaths.LOGIN}
        element={
          <AnonymousLayout>
            <Login />
          </AnonymousLayout>
        }
      />
      <Route
        path={RoutePaths.DASHBOARD}
        element={
          <AdminPage>
            <Dashboard />
          </AdminPage>
        }
      />
      <Route
        path={RoutePaths.USERS}
        element={
          <AdminPage>
            <Users />
          </AdminPage>
        }
      />
      <Route
        path={RoutePaths.USER_CREATE}
        element={
          <AdminPage>
            <UserForm />
          </AdminPage>
        }
      />
      <Route
        path={RoutePaths.USER_EDIT}
        element={
          <AdminPage>
            <UserForm />
          </AdminPage>
        }
      />
      <Route
        path={RoutePaths.GROUPS}
        element={
          <AdminPage>
            <Groups />
          </AdminPage>
        }
      />
      <Route
        path={RoutePaths.GROUP_CREATE}
        element={
          <AdminPage>
            <GroupForm />
          </AdminPage>
        }
      />
      <Route
        path={RoutePaths.GROUP_EDIT}
        element={
          <AdminPage>
            <GroupForm />
          </AdminPage>
        }
      />
      <Route
        path={RoutePaths.DOMAIN}
        element={
          <AdminPage>
            <Domain />
          </AdminPage>
        }
      />
      <Route
        path="*"
        element={
          <AdminPage>
            <NotFound />
          </AdminPage>
        }
      />
    </Routes>
  );
}
