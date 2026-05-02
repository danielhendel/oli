"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchDevFoodCatalog = searchDevFoodCatalog;
exports.getDevFoodById = getDevFoodById;
exports.getDevFoodByBarcode = getDevFoodByBarcode;
const CATALOG = [
    {
        id: "dev_oats_40g",
        name: "Rolled oats",
        brand: "Oli Pantry",
        servingLabel: "40 g dry",
        caloriesKcal: 150,
        proteinG: 5,
        carbsG: 27,
        fatG: 3,
        fiberG: 4,
        sugarG: 1,
        sodiumMg: 0,
        barcode: "0085000427483",
    },
    {
        id: "dev_greek_yogurt_170g",
        name: "Greek yogurt plain",
        brand: "Oli Pantry",
        servingLabel: "170 g",
        caloriesKcal: 100,
        proteinG: 17,
        carbsG: 6,
        fatG: 0,
        sugarG: 4,
        sodiumMg: 65,
        barcode: "0085000427484",
    },
    {
        id: "dev_chicken_breast_100g",
        name: "Chicken breast grilled",
        brand: "Oli Pantry",
        servingLabel: "100 g",
        caloriesKcal: 165,
        proteinG: 31,
        carbsG: 0,
        fatG: 3.6,
        sodiumMg: 74,
    },
    {
        id: "dev_banana_medium",
        name: "Banana",
        brand: "",
        servingLabel: "1 medium (118 g)",
        caloriesKcal: 105,
        proteinG: 1.3,
        carbsG: 27,
        fatG: 0.4,
        fiberG: 3.1,
        sugarG: 14,
        sodiumMg: 1,
    },
];
function norm(s) {
    return s.trim().toLowerCase();
}
/**
 * Deterministic substring search over the dev catalog (no network; stable for tests).
 */
function searchDevFoodCatalog(query, limit = 40) {
    const q = norm(query);
    if (q.length === 0) {
        return [...CATALOG].slice(0, Math.min(limit, CATALOG.length));
    }
    const out = [];
    for (const item of CATALOG) {
        const hay = `${item.name} ${item.brand ?? ""} ${item.servingLabel}`.toLowerCase();
        if (hay.includes(q))
            out.push(item);
        if (out.length >= limit)
            break;
    }
    return out;
}
function getDevFoodById(id) {
    const t = id.trim();
    for (const item of CATALOG) {
        if (item.id === t)
            return item;
    }
    return null;
}
function getDevFoodByBarcode(barcode) {
    const t = barcode.trim();
    if (!t)
        return null;
    for (const item of CATALOG) {
        if (item.barcode === t)
            return item;
    }
    return null;
}
