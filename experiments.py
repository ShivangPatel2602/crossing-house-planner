"""Stress-test the v1 model on random draws of the toy workbook.

The toy sheet's priorities and flower counts are RANDBETWEEN, so the saved
values are just one draw. This resamples them to see which constraints
actually bind and how sensitive the plan is to the priority weighting.
"""

import random
from collections import Counter

from crossing_model import load_instance, resample, solve

DRAWS = 300


def main():
    base = load_instance("toyexample.xlsx")
    rng = random.Random(42)
    draws = [resample(base, rng) for _ in range(DRAWS)]

    print(f"{DRAWS} random draws of priorities (1-3) and flowers (0-10), {len(base.crosses)} crosses\n")
    print("rooms | crosses made (mean) | P1 made % | rooms used (mean) | unmade: no flowers / competition")
    for rooms in (1, 2, 3, 4, 5):
        made = p1_made = p1_total = used = 0
        reasons = Counter()
        for d in draws:
            d.rooms = rooms
            sol = solve(d)
            made += len(sol.made)
            used += len(sol.rooms)
            p1_total += sum(c.priority == 1 for c in d.crosses)
            p1_made += sum(c.priority == 1 for c in sol.made)
            for why in sol.unmade.values():
                reasons["competition" if "Competition" in why else "no flowers"] += 1
        print(f"{rooms:5} | {made / DRAWS:19.2f} | {100 * p1_made / max(p1_total, 1):8.0f}% | "
              f"{used / DRAWS:17.2f} | {reasons['no flowers'] / DRAWS:.2f} / {reasons['competition'] / DRAWS:.2f}")

    print("\nDraws where 'linear' and 'strict' weights choose different crosses:")
    for rooms in (1, 2, 3):
        differ = worse_p1 = 0
        for d in draws:
            d.rooms = rooms
            lin, strict = solve(d, "linear"), solve(d, "strict")
            if {c.key for c in lin.made} != {c.key for c in strict.made}:
                differ += 1
                if sum(c.priority == 1 for c in lin.made) < sum(c.priority == 1 for c in strict.made):
                    worse_p1 += 1
        print(f"  {rooms} room(s): {differ}/{DRAWS} differ; linear drops a P1 cross in {worse_p1}")

    print("\nMin female stalks per cross (5 rooms): crosses made (mean)")
    for k in (1, 2, 3):
        made = 0
        for d in draws:
            d.rooms, d.min_female_stalks = 5, k
            made += len(solve(d).made)
        print(f"  >= {k} stalk(s): {made / DRAWS:.2f}")


if __name__ == "__main__":
    main()
