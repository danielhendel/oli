// apps/mobile/ios/olimobile/Compat+ExpoDevLauncher.swift
import Expo
import React

// Back-compat for older expo-dev-launcher code paths that still
// reference `reactNativeFactory` on ExpoReactDelegate.
extension ExpoReactDelegate {
  @objc var reactNativeFactory: RCTReactNativeFactory? {
    return self.factory as? RCTReactNativeFactory
  }
}
