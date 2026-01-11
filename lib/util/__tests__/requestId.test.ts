import { newRequestId } from "../requestId";

test("newRequestId returns non-empty and is very likely unique", () => {
  const a = newRequestId();
  const b = newRequestId();
  expect(typeof a).toBe("string");
  expect(a.length).toBeGreaterThan(5);
  expect(a).not.toEqual(b);
});
