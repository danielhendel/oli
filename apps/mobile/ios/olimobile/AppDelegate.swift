// apps/mobile/ios/olimobile/AppDelegate.swift
import Expo
import UIKit

@main
class AppDelegate: ExpoAppDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey : Any]? = nil
  ) -> Bool {
    // Optional: customize global UI (e.g., tint)
    // self.window?.tintColor = UIColor.systemBlue
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
}
