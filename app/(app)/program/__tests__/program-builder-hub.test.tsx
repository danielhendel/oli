import React, { act } from "react";
import fs from "node:fs";
import path from "node:path";
import renderer from "react-test-renderer";

const mockRedirect = jest.fn((props: { href: string }) => {
  return React.createElement("Redirect", props);
});

jest.mock("expo-router", () => ({
  Redirect: (props: { href: string }) => mockRedirect(props),
}));

import ProgramBuilderHubRoute from "../builder";

beforeEach(() => {
  mockRedirect.mockClear();
});

describe("Program Builder hub (Stage 1B)", () => {
  it("redirects the placeholder builder grid to the real workout builder", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<ProgramBuilderHubRoute />);
    });
    expect(mockRedirect).toHaveBeenCalledWith(
      expect.objectContaining({ href: "/(app)/program/workout" }),
    );
    const str = JSON.stringify(test.toJSON());
    expect(str).not.toContain("Cardio Builder");
    expect(str).not.toContain("Coming soon");
  });

  it("does not add Firebase or raw HTTP/API calls to the builder route", () => {
    const routePath = path.join(__dirname, "..", "builder.tsx");
    const src = fs.readFileSync(routePath, "utf8");
    expect(src).not.toMatch(/\bfetch\s*\(/);
    expect(src).not.toMatch(/from\s+["'][^"']*firebase[^"']*["']/i);
    expect(src).not.toMatch(/from\s+["'][^"']*lib\/api\/http["']/);
    expect(src).not.toMatch(/apiGet[A-Za-z]*\s*\(/);
  });
});
