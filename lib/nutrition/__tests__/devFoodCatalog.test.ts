import {
  getDevFoodByBarcode,
  getDevFoodById,
  searchDevFoodCatalog,
} from "../../../services/api/src/lib/nutritionDevFoodCatalog";

describe("devFoodCatalog", () => {
  it("finds oats by barcode deterministically", () => {
    const item = getDevFoodByBarcode("0085000427483");
    expect(item?.id).toBe("dev_oats_40g");
  });

  it("search is case-insensitive substring match", () => {
    const items = searchDevFoodCatalog("CHICKEN");
    expect(items.some((i) => i.id === "dev_chicken_breast_100g")).toBe(true);
  });

  it("getDevFoodById returns null for unknown id", () => {
    expect(getDevFoodById("missing")).toBeNull();
  });
});
