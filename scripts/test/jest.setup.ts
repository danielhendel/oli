// scripts/test/jest.setup.ts

const originalWarn = console.warn.bind(console);

function isExpectedFirestorePermissionDeniedWarning(args: unknown[]): boolean {
  // Firestore logs typically come through as:
  // console.warn("[timestamp]  @firebase/firestore: Firestore (...): GrpcConnection RPC 'Write' ... Code: 7 Message: 7 PERMISSION_DENIED: ...")
  const text = args
    .map((a) => (typeof a === "string" ? a : ""))
    .join(" ");

  return (
    text.includes("@firebase/firestore") &&
    text.includes("GrpcConnection RPC 'Write'") &&
    text.includes("PERMISSION_DENIED")
  );
}

console.warn = (...args: unknown[]) => {
  if (isExpectedFirestorePermissionDeniedWarning(args)) return;
  originalWarn(...args);
};