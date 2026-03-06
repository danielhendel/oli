/**
 * Jest mock for expo-video so tests that load ExerciseMediaPreview do not require native module.
 */
const React = require("react");
const { View } = require("react-native");

const noop = () => {};

function useVideoPlayer(_source, setup) {
  const player = {
    loop: false,
    muted: false,
    play: noop,
    pause: noop,
    replace: noop,
    addListener: noop,
    remove: noop,
  };
  if (typeof setup === "function") {
    try {
      setup(player);
    } catch (_) {
      // ignore in tests
    }
  }
  return player;
}

function VideoView() {
  return React.createElement(View, { testID: "mock-video-view" });
}

exports.useVideoPlayer = useVideoPlayer;
exports.VideoView = VideoView;
