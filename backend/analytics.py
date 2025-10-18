# backend/analytics.py
import csv
from collections import defaultdict
from typing import Tuple, List, Dict

CATEGORY_RULES = {
    "Продукты": ["магазин", "супермаркет", "market", "grocery", "продукт", "magazin"],
    "Транспорт": ["такси", "uber", "bolt", "метро", "автобус", "taxi", "transport"],
    "Развлечения": ["кино", "кафе", "бар", "ресторан", "club", "concert"],
    "ЖКХ": ["вода", "газ", "электр", "коммун"],
    "Здоровье": ["аптека", "clinic", "hospital", "мед"],
    "Обучение": ["курс", "универ", "edu", "школа", "обучение"],
    "Разное": []
}

def categorize_text(desc: str) -> str:
    if not desc:
        return "Разное"
    lower = desc.lower()
    for cat, tokens in CATEGORY_RULES.items():
        for t in tokens:
            if t in lower:
                return cat
    return "Разное"

def parse_transactions_csv(path: str) -> Tuple[List[dict], Dict[str, float]]:
    """
    Expects CSV with columns: date, amount, description (or merchant).
    Returns (rows_list, totals_by_category)
    """
    rows = []
    totals = defaultdict(float)
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for r in reader:
            amount_raw = r.get("amount", "") or r.get("sum", "") or "0"
            try:
                amount = float(amount_raw)
            except Exception:
                # try to sanitize: remove commas/spaces
                cleaned = amount_raw.replace(",", "").replace(" ", "")
                try:
                    amount = float(cleaned)
                except Exception:
                    amount = 0.0
            desc = (r.get("description") or r.get("merchant") or "").strip()
            category = categorize_text(desc)
            rows.append({"date": r.get("date", ""), "amount": amount, "description": desc, "category": category})
            totals[category] += amount
    return rows, dict(totals)

def summarize_spending_by_category(totals: Dict[str, float]) -> List[Dict[str, object]]:
    total_sum = sum(totals.values()) or 1.0
    out = []
    for cat, amt in totals.items():
        out.append({"category": cat, "amount": amt, "pct": round(amt / total_sum * 100, 1)})
    out.sort(key=lambda x: -x["amount"])
    return out

def quick_savings_advice(totals: Dict[str, float], monthly_income: float = None) -> List[str]:
    """
    Return 2-3 actionable advices without LLM:
    e.g. "Сократите траты на X (категория) на N KZT"
    """
    adv = []
    if not totals:
        return ["Нет данных по расходам для анализа."]
    sorted_cats = sorted(totals.items(), key=lambda x: -x[1])
    top_cat, top_amt = sorted_cats[0]
    adv.append(f"У вас наибольшие траты в категории '{top_cat}' — {int(top_amt):,} KZT. Попробуйте сократить её на 15% — это сэкономит примерно {int(top_amt*0.15):,} KZT.")
    if len(sorted_cats) > 1:
        cat2, amt2 = sorted_cats[1]
        adv.append(f"Во второй по величине категории '{cat2}' можно найти ненужные подписки/повторные покупки — проверьте транзакции и срежьте хотя бы 10% ({int(amt2*0.1):,} KZT).")
    if monthly_income:
        adv.append(f"Если ваш доход {int(monthly_income):,} KZT, попробуйте установить автоматический перевод в сбережения 10% от дохода — это {int(monthly_income*0.1):,} KZT/мес.")
    return adv
