import UIKit

/// Semantic chrome for the Oli-owned PDFKit viewer.
/// Always presents a dark navigation surface so title/Close stay readable whether
/// the host app is in Light Mode or Dark Mode. Uses UIKit dynamic colors only.
enum OliSecurePdfViewerChrome {
  /// Force dark interface style so `.label` / system fills resolve for dark chrome.
  static let forcedUserInterfaceStyle: UIUserInterfaceStyle = .dark

  static let closeButtonTitle = "Close"
  static let closeAccessibilityLabel = "Close original report"
  static let minimumCloseTargetPoints: CGFloat = 44

  static func makeNavigationBarAppearance() -> UINavigationBarAppearance {
    let appearance = UINavigationBarAppearance()
    appearance.configureWithOpaqueBackground()
    // Near-black semantic fill (dark trait); stays high-contrast for light labels.
    appearance.backgroundColor = .secondarySystemBackground
    appearance.titleTextAttributes = [
      .foregroundColor: UIColor.label,
      .font: UIFont.preferredFont(forTextStyle: .headline),
    ]
    appearance.largeTitleTextAttributes = [
      .foregroundColor: UIColor.label,
    ]
    appearance.shadowColor = .clear
    return appearance
  }

  /// Close control tint — system blue remains readable on dark chrome in Light/Dark.
  static var closeTintColor: UIColor { .systemBlue }

  static var canvasBackgroundColor: UIColor { .black }

  static var pdfViewBackgroundColor: UIColor {
    UIColor(white: 0.12, alpha: 1)
  }

  static func makeCloseBarButtonItem(
    target: Any?,
    action: Selector
  ) -> UIBarButtonItem {
    let button = UIButton(type: .system)
    button.accessibilityLabel = closeAccessibilityLabel
    button.addTarget(target, action: action, for: .touchUpInside)

    var config = UIButton.Configuration.plain()
    config.title = closeButtonTitle
    config.baseForegroundColor = closeTintColor
    config.contentInsets = NSDirectionalEdgeInsets(top: 10, leading: 8, bottom: 10, trailing: 8)
    button.configuration = config
    button.titleLabel?.adjustsFontForContentSizeCategory = true

    // Enforce >=44pt effective target without changing visible chrome density.
    button.heightAnchor.constraint(greaterThanOrEqualToConstant: minimumCloseTargetPoints).isActive = true
    let width = button.widthAnchor.constraint(greaterThanOrEqualToConstant: minimumCloseTargetPoints)
    width.priority = .defaultHigh
    width.isActive = true

    let item = UIBarButtonItem(customView: button)
    item.accessibilityLabel = closeAccessibilityLabel
    return item
  }
}
