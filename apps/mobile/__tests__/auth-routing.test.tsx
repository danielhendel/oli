// apps/mobile/__tests__/auth-routing.test.tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import RootLayout from '../app/_layout';
import { __mockReplace, __mockUsePathname } from 'expo-router';

describe('Auth routing guard', () => {
  beforeEach(() => {
    __mockReplace.mockClear();
    __mockUsePathname.mockReset();
  });

  it('redirects unauthenticated users launched at "/" to /auth-sign-in', () => {
    __mockUsePathname.mockReturnValue('/');

    render(<RootLayout />);

    // RootRedirect should render <Redirect href="/auth/sign-in" />
    // and our mock Redirect calls mockReplace(href)
    expect(__mockReplace).toHaveBeenCalledWith('/auth/sign-in');
  });

  it('does not redirect if pathname is already /auth/sign-in', () => {
    __mockUsePathname.mockReturnValue('/auth/sign-in');

    render(<RootLayout />);

    expect(__mockReplace).not.toHaveBeenCalled();
  });
});
