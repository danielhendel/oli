import PDFKit
import UIKit

protocol OliSecurePdfViewControllerDelegate: AnyObject {
  func securePdfViewControllerDidDismiss(_ controller: OliSecurePdfViewController)
}

/// Oli-owned view-only PDFKit controller. Close only — no share/print/export chrome.
final class OliSecurePdfViewController: UIViewController, PDFViewDelegate, UIAdaptivePresentationControllerDelegate {
  weak var dismissalDelegate: OliSecurePdfViewControllerDelegate?

  private let document: PDFDocument
  private let navTitle: String
  private let pdfView = PDFView()
  private var didNotifyDismiss = false

  init(document: PDFDocument, title: String) {
    self.document = document
    self.navTitle = title
    super.init(nibName: nil, bundle: nil)
    // Page sheet (large detent) keeps Oli-owned chrome while allowing interactive swipe dismiss.
    modalPresentationStyle = .pageSheet
    if let sheet = sheetPresentationController {
      sheet.detents = [.large()]
      sheet.prefersGrabberVisible = false
      sheet.prefersScrollingExpandsWhenScrolledToEdge = false
    }
  }

  @available(*, unavailable)
  required init?(coder: NSCoder) {
    fatalError("init(coder:) has not been implemented")
  }

  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = .black

    let closeItem = UIBarButtonItem(
      title: "Close",
      style: .plain,
      target: self,
      action: #selector(closeTapped)
    )
    closeItem.accessibilityLabel = "Close original report"

    let navBar = UINavigationBar()
    navBar.translatesAutoresizingMaskIntoConstraints = false
    navBar.prefersLargeTitles = false
    let appearance = UINavigationBarAppearance()
    appearance.configureWithOpaqueBackground()
    appearance.backgroundColor = UIColor(white: 0.08, alpha: 1)
    appearance.titleTextAttributes = [
      .foregroundColor: UIColor.label,
      .font: UIFont.preferredFont(forTextStyle: .headline),
    ]
    navBar.standardAppearance = appearance
    navBar.scrollEdgeAppearance = appearance
    navBar.compactAppearance = appearance
    navBar.tintColor = .label

    let navItem = UINavigationItem(title: navTitle)
    navItem.leftBarButtonItem = closeItem
    navBar.items = [navItem]

    pdfView.translatesAutoresizingMaskIntoConstraints = false
    pdfView.autoScales = true
    pdfView.displayDirection = .vertical
    pdfView.displayMode = .singlePageContinuous
    pdfView.displaysPageBreaks = true
    pdfView.backgroundColor = UIColor(white: 0.12, alpha: 1)
    pdfView.enableDataDetectors = false
    pdfView.delegate = self
    // Set document only after native validation (caller responsibility).
    pdfView.document = document

    view.addSubview(navBar)
    view.addSubview(pdfView)

    let guide = view.safeAreaLayoutGuide
    NSLayoutConstraint.activate([
      navBar.topAnchor.constraint(equalTo: guide.topAnchor),
      navBar.leadingAnchor.constraint(equalTo: view.leadingAnchor),
      navBar.trailingAnchor.constraint(equalTo: view.trailingAnchor),
      pdfView.topAnchor.constraint(equalTo: navBar.bottomAnchor),
      pdfView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
      pdfView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
      pdfView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
    ])
  }

  override func viewDidAppear(_ animated: Bool) {
    super.viewDidAppear(animated)
    presentationController?.delegate = self
  }

  deinit {
    pdfView.document = nil
  }

  func clearDocumentReference() {
    pdfView.document = nil
  }

  @objc private func closeTapped() {
    dismiss(animated: true) { [weak self] in
      self?.notifyDismissedOnce()
    }
  }

  func presentationControllerDidDismiss(_ presentationController: UIPresentationController) {
    notifyDismissedOnce()
  }

  private func notifyDismissedOnce() {
    guard !didNotifyDismiss else { return }
    didNotifyDismiss = true
    clearDocumentReference()
    dismissalDelegate?.securePdfViewControllerDidDismiss(self)
  }

  // MARK: - PDFViewDelegate (fail closed for export / external actions)

  func pdfViewWillClick(onLink sender: PDFView, with url: URL) {
    // Fail closed: do not open Safari, WebBrowser, or any external surface.
    _ = (sender, url)
  }

  func pdfViewPerformPrint(_ sender: PDFView) {
    // No print surface.
    _ = sender
  }

  func pdfViewOpenPDF(_ sender: PDFView, forRemoteGoToAction action: PDFActionRemoteGoTo) {
    // Do not follow remote file opens / attachments.
    _ = (sender, action)
  }

  func pdfViewPerformFind(_ sender: PDFView) {
    // Find is not an export surface; leave default unused (no-op).
    _ = sender
  }

  override func canPerformAction(_ action: Selector, withSender sender: Any?) -> Bool {
    // Block share / copy / markup menu actions that could export content.
    _ = (action, sender)
    return false
  }

  override var canBecomeFirstResponder: Bool { false }
}
