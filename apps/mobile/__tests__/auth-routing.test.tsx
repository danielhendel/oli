// __tests__/auth-routing.test.tsx

import React from 'react';
import { render } from '@testing-library/react-native';
import RootLayout from '@/app/_layout';
import * as ExpoRouter from 'expo-router';

describe('Auth routing guard', () => {
  // Grab the mock router helpers that jest-setup.ts exposes
  const { __mockReplace, __mockUsePathname } = ExpoRouter as unknown as {
    __mockReplace: jest.Mock;
    __mockPush: jest.Mock;
    __mockUsePathname: jest.Mock;
  };

  beforeEach(() => {
    __mockReplace.mockClear();
    __mockUsePathname.mockReset();
  });

  it('redirects unauthenticated users launched at "/" to /auth/sign-in', () => {
    // Simulate app launch at root path
    __mockUsePathname.mockReturnValue('/');

    render(<RootLayout />);

    expect(__mockReplace).toHaveBeenCalledWith('/auth/sign-in');
  });
});
