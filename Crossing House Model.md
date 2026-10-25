bin-project · v1 model

# Crossing House Model

How the planner decides which crosses to make each day and which room every flowering stalk goes into, with the full mathematical formulation behind it.

## The problem

Each day the breeder has a list of desired crosses (male × female, priority 1 to 3), a count of flowering stalks on each parent, and a limited number of free rooms. The planner chooses the most valuable set of crosses to make and packs their stalks into rooms.

It looks like bin packing, with one biological twist that shapes the whole model: **a room holds a single male clone, and that male pollinates every female in the room.** A room is therefore “male $m$ plus some of $m$’s desired females”. A female placed with any other male would be a wasted or contaminating pollination, so the model never does it.


## How space in a room is shared

A room has **$K = 8$ slots**, and each slot is one flowering stalk. Two rules decide how a room can fill:

- **Capacity.** Male stalks plus female stalks is at most $K$.
- **Ratio.** Female stalks are at most $\rho$ times male stalks ($\rho = 3$: one male stalk supports up to three females).

So the number of females a room can hold depends on how many male stalks you spend. With $u$ male stalks, the room fits at most $\min(\rho u,\ K - u)$ females.

### Room sizes and ratios

For the defaults ($K = 8$, $\rho = 3$), each extra male stalk supports three more females but takes up a slot:

| Male stalks $u$ | Most females $\min(3u,\ 8-u)$ | Slots used |
| --- | --- | --- |
| 1 | 3 | 4 of 8 |
| **2** | **6** | **8 of 8** |
| 3 | 5 | 8 of 8 |
| 4 | 4 | 8 of 8 |

Two male stalks is the best split. A third male stalk only takes a slot a female could have used.

## The mathematical formulation

The model is a mixed-integer linear program built with PuLP in `solve()` (crossing_model.py:163) and solved twice by HiGHS: once to choose the crosses, once to decide how to fill the space that is left.

### Sets and parameters

| Symbol | Meaning |
| --- | --- |
| $R = \{1,\dots,R\}$ | rooms free today (default 5) |
| $M,\ F$ | male and female parents that appear in a usable cross |
| $C \subseteq M \times F$ | desired crosses $c = (m_c, f_c)$, keeping only those with $a_{m_c} \ge 1$ and $a_{f_c} \ge s_{\min}$ |
| $K$ | slots (stalks) per room, default 8 |
| $\rho$ | maximum female stalks per male stalk, default 3 |
| $a_p$ | flowering stalks available on parent $p$ today |
| $s_{\min}$ | female stalks needed before a cross counts as made, default 1 |
| $\pi_c,\ w_{\pi}$ | priority of cross $c$ (1 = highest) and its weight |

### Decision variables

- $z_{m,r} \in \{0,1\}$: room $r$ is given male $m$
- $u_{m,r} \in \{0,1,\dots,K\}$: stalks of male $m$ in room $r$
- $x_{c,r} \in \{0,1,\dots,K\}$: female stalks of $f_c$ placed in room $r$ for cross $c$
- $y_c \in \{0,1\}$: cross $c$ is made

A cross gets space through $x_{c,r}$. The same female clone can appear in several rooms under different males (once for each of its crosses), and one male’s crosses can be split across rooms. Only the female’s total flower count limits this.

### Constraints

**(1)** One male per room. `one_male_r`

$$
\sum_{m \in M} z_{m,r} \le 1 \qquad \forall r \in R
$$

**(2)** A room given male $m$ has at least one stalk of $m$. No stalks of $m$ go anywhere else. `u_min`, `u_link`

$$
z_{m,r} \;\le\; u_{m,r} \;\le\; K\, z_{m,r} \qquad \forall m, r
$$

**(3)** Female stalks for cross $(m, f)$ can only sit in a room whose male is $m$. This is what makes rooms male-centred. `x_link`

$$
x_{c,r} \le K\, z_{m_c,r} \qquad \forall c, r
$$

**(4)** Ratio: at most $\rho$ female stalks per male stalk. `ratio_r`

$$
\sum_{c \in C} x_{c,r} \le \rho \sum_{m \in M} u_{m,r} \qquad \forall r
$$

**(5)** Capacity: the room holds at most $K$ stalks in total. `capacity_r`

$$
\sum_{m \in M} u_{m,r} + \sum_{c \in C} x_{c,r} \le K \qquad \forall r
$$

**(6)** Flower inventory: no parent uses more stalks than it has flowering. `inv_p`

$$
\sum_{r} u_{m,r} \le a_m \;\; \forall m, \qquad \sum_{c:\, f_c = f}\ \sum_{r} x_{c,r} \le a_f \;\; \forall f
$$

**(7)** A cross only counts as made once enough female stalks share a room with its male. `made_c`

$$
s_{\min}\, y_c \le \sum_{r} x_{c,r} \qquad \forall c
$$

**(8)** Rooms are used in order. This doesn’t change the answer. It stops the solver from exploring every relabelling of the same plan. `order_r`

$$
\sum_{m} z_{m,r} \le \sum_{m} z_{m,r-1} \qquad r = 2,\dots,R
$$

### Stage 1: choose the crosses

$$
V^{*} \;=\; \max \sum_{c \in C} w_{\pi_c}\, y_c \quad \text{subject to (1)–(8)}
$$

The priority-weighted number of crosses made.

### Stage 2: fill or conserve the remaining space

**Fill (default).**

$$
\max\; \underbrace{\Big(\sum_{c,r} x_{c,r} - \sum_{m,r} u_{m,r}\Big)}_{\text{fill (default)}} \;-\; \frac{1}{R+1}\sum_{m,r} z_{m,r}
$$

More female stalks means more pollinations and seed. Each male stalk costs one point, so males are used only where the ratio needs them.

**Conserve** (`--conserve` / “Leave it empty”).

$$
\max\; -\Big(\sum_{c,r} x_{c,r} + \sum_{m,r} u_{m,r}\Big) \;-\; \frac{1}{R+1}\sum_{m,r} z_{m,r}
$$

Use as few flowers as possible and save the rest for later.

**Hold.** Stage 2 must also keep stage 1’s value:

$$
\sum_{c} w_{\pi_c}\, y_c \;\ge\; V^{*} \qquad \text{plus (1)–(8)}
$$

Stage 2 cannot trade away any of stage 1’s value, so extra seed can never cost a cross. The room term adds up to at most $R/(R+1) < 1$. The stalk counts are integers, so this term only breaks ties, in favour of plans that leave rooms free.

### Priority weights

**Linear**

$$
w_1 = 3,\quad w_2 = 2,\quad w_3 = 1
$$

Two medium crosses (4) beat one high cross (3).

**Strict**

$$
\begin{aligned} w_3 &= 1 \\ w_2 &= n_3 + 1 \\ w_1 &= n_2 w_2 + n_3 w_3 + 1 \end{aligned}
$$

$n_k$ is the number of priority-$k$ crosses. Since $w_1$ is larger than all lower crosses combined, one P1 cross is never given up for any number of lower ones.

The command line defaults to `linear`. The API and web UI default to `strict`. The same data can give different plans depending on which one you use.

### A consequence worth knowing

$$
\max_{u \ge 1}\ \min(\rho u,\; K - u) \;=\; \min(3\cdot 2,\; 8 - 2) \;=\; 6 \quad (K = 8,\ \rho = 3)
$$

A room holds at most 6 female stalks, so at most 6 crosses, all sharing one male, when $s_{\min} = 1$.

## Worked example: the toy workbook

The toy workbook has 11 desired rows, which become 10 unique crosses once the duplicate B × H is merged. Parents H and I have no flowers, which rules out 5 crosses before the model runs. These plans were produced by the command line with linear weights.

### Five rooms free

All 5 possible crosses are made, yet every room is half empty. The bottleneck is female flowers, not space: G (5 stalks) and J (4) are completely used. Adding a male stalk would only lower the fill score in S2. Three rooms are needed because the five crosses involve three different males.

### Two rooms free

Now rooms are scarce. Each room is worth the total weight of its male’s crosses that can be made:

| Male | Crosses that can be made | Weight (linear) |
| --- | --- | --- |
| D | D × J (P1), D × G (P3) | 3 + 1 = 4 |
| B | B × J (P2), B × G (P3) | 2 + 1 = 3 |
| A | A × G (P2) | 2 |

| Pair of rooms | V\* |
| --- | --- |
| D + B (chosen) | 7 |
| D + A | 6 |
| B + A | 5 |

Room 1 reaches the ideal 2 + 6 shape: two male stalks of D support six females. Stage 2 piles the four spare G stalks onto D × G, a P3 cross, because the fill objective doesn’t care which cross receives extra stalks. A × G loses out because all of G’s flowers are used.

This is the first open item for v2: spread spare stalks by priority, or toward a per-cross seed target, rather than wherever they fit.

## Explaining crosses that weren’t made

After solving, `_reason()` checks each unmade cross and gives the first explanation that matches:

1. One of its parents has no flowers today.
2. The female has fewer than $s_{\min}$ flowers.
3. A parent’s flowers were all used by more valuable crosses.
4. Every room is in use.
5. Otherwise: other crosses were worth more.

This is a good guess made after the fact. It doesn’t come from the solver (it is not based on dual values), so it describes what likely blocked the cross rather than proving it.

## Around the model

| Part | File | What it does |
| --- | --- | --- |
| Model and CLI | crossing_model.py | Reading, validation, the MIP above, reasons, text report |
| HTTP API | api.py | FastAPI: `/api/upload`, `/api/example`, `/api/plan`. Checks input ranges with Pydantic and serves the built UI |
| Web UI | frontend/src/ | Load data, settings, then plan. Re-plans 350 ms after any edit, discards out-of-date responses, and keeps the session in browser storage. Rooms are drawn as slot grids like the ones above |
| Tests | test_crossing_model.py | Checks every constraint on returned plans, plus edge cases: duplicates, 0 rooms, 0 flowers, ratio forcing a second male stalk, strict vs linear |
| Experiments | experiments.py | 300 random draws of priorities and flowers to see which constraints matter |
