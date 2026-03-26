import React from 'react';
import { Route, Routes } from 'react-router-dom';

import { RoutePaths } from './RoutePaths';
import { NotFound } from './NotFound';

// Auth
import { Login } from '../auth/Login';

// Self-Service
import { SelfServiceHome } from '../selfservice/SelfServiceHome';
import { Profile } from '../selfservice/Profile';
import { ChangePassword } from '../selfservice/ChangePassword';

// Admin
import { Dashboard } from '../dashboard/Dashboard';
import { Users } from '../users/Users';
import { UserForm } from '../users/UserForm';
import { Groups } from '../groups/Groups';
import { GroupForm } from '../groups/GroupForm';
import {OUs} from '../ous/OUs';
import { Domain } from '../domain/Domain';
import { Settings } from '../settings/Settings';
import { DrPage } from '../dr/DrPage';

// Layouts
import { AnonymousLayout } from '../layouts/AnonymousLayout';
import { LoggedLayout } from '../layouts/LoggedLayout';
import { AdminGuard } from '../layouts/AdminGuard';
import { AdminLayout } from '../layouts/AdminLayout';
import { SelfServiceLayout } from '../layouts/SelfServiceLayout';

function SelfServicePage({ children }) {
  return (
    <LoggedLayout>
      <SelfServiceLayout>{children}</SelfServiceLayout>
    </LoggedLayout>
  );
}

function AdminPage({ children }) {
  return (
    <AdminGuard>
      <AdminLayout>{children}</AdminLayout>
    </AdminGuard>
  );
}

export function Router() {
  return (
    <Routes>
      {/* Authentication */}
      <Route
        path={RoutePaths.LOGIN}
        element={
          <AnonymousLayout>
            <Login />
          </AnonymousLayout>
        }
      />

      {/* Self-Service */}
      <Route
        path={RoutePaths.SELF_SERVICE}
        element={<SelfServicePage><SelfServiceHome /></SelfServicePage>}
      />
      <Route
        path={RoutePaths.PROFILE}
        element={<SelfServicePage><Profile /></SelfServicePage>}
      />
      <Route
        path={RoutePaths.CHANGE_PASSWORD}
        element={<SelfServicePage><ChangePassword /></SelfServicePage>}
      />

      {/* Admin */}
      <Route
        path={RoutePaths.ADMIN_DASHBOARD}
        element={<AdminPage><Dashboard /></AdminPage>}
      />
      <Route
        path={RoutePaths.ADMIN_USERS}
        element={<AdminPage><Users /></AdminPage>}
      />
      <Route
        path={RoutePaths.ADMIN_USER_CREATE}
        element={<AdminPage><UserForm /></AdminPage>}
      />
      <Route
        path={RoutePaths.ADMIN_USER_EDIT}
        element={<AdminPage><UserForm /></AdminPage>}
      />
      <Route
        path={RoutePaths.ADMIN_GROUPS}
        element={<AdminPage><Groups /></AdminPage>}
      />
      <Route
        path={RoutePaths.ADMIN_GROUP_CREATE}
        element={<AdminPage><GroupForm /></AdminPage>}
      />
      <Route
        path={RoutePaths.ADMIN_GROUP_EDIT}
        element={<AdminPage><GroupForm /></AdminPage>}
      />
        <Route
            path={RoutePaths.ADMIN_OUS}
            element={<AdminPage><OUs/></AdminPage>}
        />
      <Route
        path={RoutePaths.ADMIN_DOMAIN}
        element={<AdminPage><Domain /></AdminPage>}
      />
      <Route
        path={RoutePaths.ADMIN_SETTINGS}
        element={<AdminPage><Settings /></AdminPage>}
      />

      <Route
        path={RoutePaths.ADMIN_DR}
        element={<AdminPage><DrPage /></AdminPage>}
      />

      {/* 404 */}
      <Route
        path="*"
        element={<SelfServicePage><NotFound /></SelfServicePage>}
      />
    </Routes>
  );
}
