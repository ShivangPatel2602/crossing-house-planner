"""Edge-case and invariant checks. Run: .venv/bin/python -m unittest -v"""

import random
import unittest
from collections import defaultdict

from crossing_model import FEMALE, MALE, load_instance, resample, solve, validate

SEX = {"A": MALE, "B": MALE, "G": FEMALE, "H": FEMALE, "J": FEMALE}


def check_feasible(tc, inst, sol):
    """Every hard constraint holds in the returned allocation."""
    used = defaultdict(int)
    tc.assertLessEqual(len(sol.rooms), inst.rooms)
    for room in sol.rooms:
        tc.assertLessEqual(room.size, inst.capacity)
        tc.assertLessEqual(sum(room.females.values()), inst.ratio * room.male_stalks)
        tc.assertGreaterEqual(room.male_stalks, 1)
        partners = {c.female for c in inst.crosses if c.male == room.male}
        tc.assertTrue(set(room.females) <= partners, "female placed with a non-partner male")
        used[room.male] += room.male_stalks
        for f, n in room.females.items():
            used[f] += n
    for p, n in used.items():
        tc.assertLessEqual(n, inst.available[p])


class EdgeCases(unittest.TestCase):
    def test_toy_snapshot(self):
        inst = load_instance("toyexample.xlsx")
        sol = solve(inst)
        check_feasible(self, inst, sol)
        self.assertEqual(len(inst.crosses), 10)  # B x H duplicate merged
        self.assertEqual(len(sol.made), 5)
        self.assertTrue(all("No flowers" in why for why in sol.unmade.values()))

    def test_duplicate_keeps_best_priority(self):
        inst = validate([("A", "G", 3), ("A", "G", 1)], {"A": 1, "G": 1}, SEX)
        self.assertEqual([c.priority for c in inst.crosses], [1])
        self.assertTrue(any("listed twice" in w for w in inst.warnings))

    def test_unknown_parent_and_wrong_sex_dropped(self):
        inst = validate([("A", "Z", 1), ("G", "A", 1)], {"A": 1, "G": 1}, SEX)
        self.assertEqual(inst.crosses, [])
        self.assertEqual(sum("dropped" in w for w in inst.warnings), 2)

    def test_zero_rooms(self):
        inst = validate([("A", "G", 1)], {"A": 5, "G": 5}, SEX, rooms=0)
        sol = solve(inst)
        self.assertEqual(sol.made, [])

    def test_no_flowers_anywhere(self):
        inst = validate([("A", "G", 1)], {"A": 0, "G": 0}, SEX)
        sol = solve(inst)
        self.assertEqual(sol.made, [])
        self.assertIn("No flowers", next(iter(sol.unmade.values())))

    def test_ratio_forces_second_male_stalk(self):
        # 6 G stalks need 2 male stalks; with only 1 A stalk at most 3 fit.
        inst = validate([("A", "G", 1)], {"A": 1, "G": 6}, SEX)
        sol = solve(inst)
        self.assertEqual(sol.rooms[0].females["G"], 3)
        inst.available["A"] = 2
        sol = solve(inst)
        self.assertEqual(sol.rooms[0].females["G"], 6)

    def test_one_male_per_room(self):
        # Two males, one room: only one male's crosses can be made.
        inst = validate([("A", "G", 1), ("B", "H", 1)], {"A": 1, "B": 1, "G": 1, "H": 1}, SEX, rooms=1)
        sol = solve(inst)
        self.assertEqual(len(sol.made), 1)

    def test_strict_weights_never_trade_down(self):
        # One room: A gives a single P1 cross, B gives two P2 crosses.
        raw = [("A", "G", 1), ("B", "H", 2), ("B", "J", 2)]
        avail = {"A": 1, "B": 1, "G": 1, "H": 1, "J": 1}
        linear = solve(validate(raw, avail, SEX, rooms=1), "linear")
        strict = solve(validate(raw, avail, SEX, rooms=1), "strict")
        self.assertEqual({c.male for c in linear.made}, {"B"})  # 2+2 > 3
        self.assertEqual({c.male for c in strict.made}, {"A"})

    def test_random_draws_feasible(self):
        base = load_instance("toyexample.xlsx", rooms=2)
        rng = random.Random(0)
        for _ in range(25):
            inst = resample(base, rng)
            check_feasible(self, inst, solve(inst))


if __name__ == "__main__":
    unittest.main()
