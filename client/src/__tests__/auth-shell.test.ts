// ==============================================================================
// Z Institute Management System - Phase 3 Auth Shell & Component Tests
// ==============================================================================

import { describe, it, expect } from 'vitest';
import { Login } from '../pages/Login';
import { DashboardOverview } from '../pages/DashboardOverview';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Sidebar } from '../components/layout/Sidebar';
import { Header } from '../components/layout/Header';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { ModulePlaceholder } from '../pages/ModulePlaceholder';
import { App } from '../App';

describe('Auth Shell Structure & Component Verification', () => {
  it('Application entrypoint App is a valid React component', () => {
    expect(typeof App).toBe('function');
  });

  it('Login page is a valid React component', () => {
    expect(typeof Login).toBe('function');
  });

  it('Dashboard overview page is a valid React component', () => {
    expect(typeof DashboardOverview).toBe('function');
  });

  it('Dashboard shell layout is a valid React component', () => {
    expect(typeof DashboardLayout).toBe('function');
  });

  it('Sidebar navigation is a valid React component', () => {
    expect(typeof Sidebar).toBe('function');
  });

  it('Global Header is a valid React component', () => {
    expect(typeof Header).toBe('function');
  });

  it('ProtectedRoute guard is a valid React component', () => {
    expect(typeof ProtectedRoute).toBe('function');
  });

  it('ModulePlaceholder view is a valid React component', () => {
    expect(typeof ModulePlaceholder).toBe('function');
  });
});
