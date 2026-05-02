export type NutritionixProviderErrorCode =
  | "AUTH"
  | "NOT_FOUND"
  | "RATE_LIMIT"
  | "UNAVAILABLE"
  | "BAD_RESPONSE";

export class NutritionixProviderError extends Error {
  override readonly name = "NutritionixProviderError";

  constructor(
    readonly code: NutritionixProviderErrorCode,
    message: string,
    readonly httpStatus?: number,
  ) {
    super(message);
  }
}
