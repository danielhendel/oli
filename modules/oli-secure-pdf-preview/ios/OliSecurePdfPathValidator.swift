import Foundation

/// Defense-in-depth path validation for Body Scan original PDFs.
/// Never logs URI, path, filename, account scope, document ID, or nonce.
enum OliSecurePdfPathValidator {
  static let bodyScanCacheRootName = "body-scans"

  enum Failure: String {
    case invalidFileUri = "invalid_file_uri"
    case outsideAllowedCacheRoot = "outside_allowed_cache_root"
    case fileMissing = "file_missing"
  }

  enum Outcome {
    case ok(URL)
    case failed(Failure)
  }

  static func validate(localUri: String) -> Outcome {
    guard let url = URL(string: localUri), url.isFileURL else {
      return .failed(.invalidFileUri)
    }

    // Reject non-file schemes and network URLs explicitly.
    if let scheme = url.scheme?.lowercased(), scheme != "file" {
      return .failed(.invalidFileUri)
    }

    let standardized = url.standardizedFileURL
    let resolved = URL(fileURLWithPath: standardized.path).resolvingSymlinksInPath()

    guard let cachesRoot = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first else {
      return .failed(.outsideAllowedCacheRoot)
    }

    let cachesResolved = cachesRoot.resolvingSymlinksInPath().standardizedFileURL
    let bodyScansRoot = cachesResolved
      .appendingPathComponent(bodyScanCacheRootName, isDirectory: true)
      .standardizedFileURL

    let resolvedPath = resolved.path
    let bodyScansPath = bodyScansRoot.path

    // Require containment under Caches/body-scans after symlink resolution.
    guard resolvedPath.hasPrefix(bodyScansPath.hasSuffix("/") ? bodyScansPath : bodyScansPath + "/")
      || resolvedPath == bodyScansPath
    else {
      return .failed(.outsideAllowedCacheRoot)
    }

    // Reject traversal remnants and Documents/Downloads escapes.
    if resolvedPath.contains("/../") || resolvedPath.hasSuffix("/..") {
      return .failed(.outsideAllowedCacheRoot)
    }
    let lower = resolvedPath.lowercased()
    if lower.contains("/documents/") || lower.contains("/downloads/") {
      return .failed(.outsideAllowedCacheRoot)
    }

    guard resolved.pathExtension.lowercased() == "pdf" else {
      return .failed(.invalidFileUri)
    }

    var isDirectory: ObjCBool = false
    guard FileManager.default.fileExists(atPath: resolvedPath, isDirectory: &isDirectory),
          !isDirectory.boolValue
    else {
      return .failed(.fileMissing)
    }

    guard let attrs = try? FileManager.default.attributesOfItem(atPath: resolvedPath),
          let fileSize = attrs[.size] as? NSNumber,
          fileSize.intValue > 0
    else {
      return .failed(.fileMissing)
    }

    // Confirm regular file (not symlink-as-directory leftover).
    if let type = attrs[.type] as? FileAttributeType, type != .typeRegular {
      return .failed(.fileMissing)
    }

    return .ok(resolved)
  }
}
