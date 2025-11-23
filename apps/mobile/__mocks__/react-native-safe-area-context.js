// __mocks__/react-native-safe-area-context.js
const React = require('react');

module.exports = {
  SafeAreaView: ({ children }) => React.createElement('div', null, children),
  SafeAreaProvider: ({ children }) => React.createElement('div', null, children),
  SafeAreaInsetsContext: {
    Consumer: ({ children }) => children({ top: 0, left: 0, right: 0, bottom: 0 }),
    Provider: ({ children }) => children,
  },

  // For edge configuration used in your header
  useSafeAreaInsets: () => ({ top: 0, left: 0, right: 0, bottom: 0 }),
  initialWindowSafeAreaInsets: { top: 0, left: 0, right: 0, bottom: 0 },
};
