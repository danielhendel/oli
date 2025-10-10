// apps/mobile/__tests__/auth-routing.test.tsx
/* eslint-env jest */
import { render } from '@testing-library/react-native';
import type { ReactNode } from 'react';

const mockReplace = jest.fn();

// Mock expo-router entirely (no ESM import, no JSX in factory)
jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
  }),
  // Simulate we're NOT in /auth/*
  useSegments: () => ['index'],
  // Simple passthrough "Slot"
  Slot: ({ children }: { children?: ReactNode }) => (children ?? null),
}));

// Mock ThemeProvider to a passthrough to avoid pulling real theme module logic
jest.mock('@/theme', () => ({
  __esModule: true,
  // return children without JSX to avoid out-of-scope React in mock factories
  ThemeProvider: ({ children }: { children?: ReactNode }) => (children ?? null),
}));

// Mock AuthProvider (default) to passthrough AND provide useAuth (unauthenticated state)
jest.mock('@/providers/AuthProvider', () => ({
  __esModule: true,
  default: ({ children }: { children?: ReactNode }) => (children ?? null),
  useAuth: () => ({ user: null, initializing: false }),
}));

// Import after mocks
import RootLayout from '@/app/_layout';

describe('Auth routing guard', () => {
  beforeEach(() => {
    mockReplace.mockClear();
  });

  it('redirects unauthenticated users to /auth/sign-in', () => {
    render(<RootLayout />);
    expect(mockReplace).toHaveBeenCalledWith('/auth/sign-in');
  });
});
