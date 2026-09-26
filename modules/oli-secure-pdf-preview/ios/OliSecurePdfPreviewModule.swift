import ExpoModulesCore
import ObjectiveC
import PDFKit
import UIKit

public class OliSecurePdfPreviewModule: Module {
  private var activeController: OliSecurePdfViewController?
  private var activePromise: Promise?
  private var isPresenting = false

  public func definition() -> ModuleDefinition {
    Name("OliSecurePdfPreview")

    AsyncFunction("presentAsync") { (options: SecurePdfPreviewOptions, promise: Promise) in
      if self.isPresenting || self.activeController != nil {
        promise.resolve(Self.failure("preview_already_presented"))
        return
      }

      switch OliSecurePdfPathValidator.validate(localUri: options.localUri) {
      case .failed(let failure):
        promise.resolve(Self.failure(failure.rawValue))
        return
      case .ok(let fileURL):
        guard let document = PDFDocument(url: fileURL) else {
          promise.resolve(Self.failure("pdf_invalid"))
          return
        }

        if document.isLocked || document.isEncrypted {
          promise.resolve(Self.failure("pdf_locked"))
          return
        }

        if document.pageCount <= 0 {
          promise.resolve(Self.failure("pdf_empty"))
          return
        }

        guard let presenter = self.resolvePresenter() else {
          promise.resolve(Self.failure("presenter_unavailable"))
          return
        }

        let title: String
        if let provided = options.title, !provided.isEmpty {
          title = provided
        } else {
          title = "Original Report"
        }

        let controller = OliSecurePdfViewController(document: document, title: title)
        let bridge = DismissalBridge(module: self)
        controller.dismissalDelegate = bridge
        // Retain bridge for the presentation lifetime.
        objc_setAssociatedObject(
          controller,
          &DismissalBridge.associatedKey,
          bridge,
          .OBJC_ASSOCIATION_RETAIN_NONATOMIC
        )

        self.isPresenting = true
        self.activeController = controller
        self.activePromise = promise

        presenter.present(controller, animated: true) {
          // Presentation completed; settlement waits for dismiss.
        }
      }
    }
    .runOnQueue(.main)
  }

  fileprivate func handleDismissed(_ controller: OliSecurePdfViewController) {
    guard activeController === controller else { return }
    controller.clearDocumentReference()
    let promise = activePromise
    activePromise = nil
    activeController = nil
    isPresenting = false
    promise?.resolve([
      "ok": true,
      "method": "pdfkit",
      "settlement": "dismissed",
      "deleteImmediately": true,
    ] as [String: Any])
  }

  private func resolvePresenter() -> UIViewController? {
    guard let base = appContext?.utilities?.currentViewController() else {
      return nil
    }
    return Self.topMost(from: base)
  }

  private static func topMost(from root: UIViewController) -> UIViewController {
    var current = root
    while true {
      if let presented = current.presentedViewController {
        current = presented
        continue
      }
      if let nav = current as? UINavigationController, let visible = nav.visibleViewController {
        current = visible
        continue
      }
      if let tab = current as? UITabBarController, let selected = tab.selectedViewController {
        current = selected
        continue
      }
      break
    }
    return current
  }

  private static func failure(_ code: String) -> [String: Any] {
    [
      "ok": false,
      "safeReasonCode": code,
    ]
  }
}

private struct SecurePdfPreviewOptions: Record {
  @Field
  var localUri: String = ""

  @Field
  var title: String?
}

private final class DismissalBridge: OliSecurePdfViewControllerDelegate {
  static var associatedKey: UInt8 = 0
  weak var module: OliSecurePdfPreviewModule?

  init(module: OliSecurePdfPreviewModule) {
    self.module = module
  }

  func securePdfViewControllerDidDismiss(_ controller: OliSecurePdfViewController) {
    module?.handleDismissed(controller)
  }
}
