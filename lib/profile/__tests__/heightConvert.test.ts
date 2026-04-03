import { cmToFeetInches, feetInchesToCm } from "../heightConvert";

describe("heightConvert", () => {
  it("round-trips cm through feet/inches", () => {
    const cm = 175;
    const { feet, inches } = cmToFeetInches(cm);
    const back = feetInchesToCm(feet, inches);
    expect(Math.abs(back - cm)).toBeLessThan(1.5);
  });
});
