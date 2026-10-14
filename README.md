#!/usr/bin/env python3
"""
Real-life style Human Evolution Simulator
Dinosaurs → Mammals → Humans → Civilization → Future
Includes: sex, marriages, babies, loners, technology, weapons, houses, politics
Real-time pacing: 10 years per minute once humans appear
"""

import random
import math
import time
from dataclasses import dataclass, field
from typing import List, Optional, Dict

# ============================================================
# CONFIG
# ============================================================
START_YEAR           = -65_000_000
HUMAN_ERA_START      = -300_000          # switch to real-time here
END_YEAR             =  2_200
YEARS_PER_MINUTE     = 10
REAL_SECONDS_PER_STEP = 60               # 1 real minute = 10 simulated years
MAX_AGENTS           = 650
SEED                 = 42
random.seed(SEED)

# ============================================================
# AGENT & SOCIETY
# ============================================================
@dataclass
class Agent:
    id: int
    birth_year: int
    sex: str                          # 'M' or 'F'
    intelligence: float
    aggression: float
    sociality: float
    libido: float                     # desire for sex
    health: float = 82.0
    married_to: Optional[int] = None
    children: List[int] = field(default_factory=list)
    tech_affinity: float = 0.0
    political_lean: float = 0.0
    alive: bool = True
    is_loner: bool = False
    last_sex_year: int = -999999

    def age(self, year: int) -> int:
        return year - self.birth_year

@dataclass
class Society:
    year: int = START_YEAR
    agents: Dict[int, Agent] = field(default_factory=dict)
    next_id: int = 0
    tech_level: float = 0.0
    tech_names = [
        "None", "Tools", "Fire", "Language", "Agriculture",
        "Metalworking", "Writing", "Gunpowder", "Industrial",
        "Electricity", "Computers", "Internet", "AI", "Spacefaring", "Post-Human"
    ]
    political_system: str = "None"
    houses: int = 0
    weapons: int = 0
    total_births: int = 0
    total_deaths: int = 0
    marriages: int = 0
    sexual_encounters: int = 0
    loners: int = 0
    disasters: int = 0
    history: List[str] = field(default_factory=list)

    def log(self, msg: str):
        entry = f"[{self.year:+,}] {msg}"
        self.history.append(entry)
        print(entry)

def clamp(v, lo=0.0, hi=100.0):
    return max(lo, min(hi, v))

def mutate(val, amount=5.0):
    return clamp(val + random.gauss(0, amount))

def tech_name(level: float) -> str:
    idx = min(int(level), len(Society.tech_names) - 1)
    return Society.tech_names[idx]

# ============================================================
# CORE MECHANICS
# ============================================================
def create_initial_population(soc: Society, n=48):
    for _ in range(n):
        a = Agent(
            id=soc.next_id,
            birth_year=soc.year - random.randint(1, 16),
            sex=random.choice(['M', 'F']),
            intelligence=random.uniform(8, 23),
            aggression=random.uniform(20, 58),
            sociality=random.uniform(25, 75),
            libido=random.uniform(30, 80),
            health=random.uniform(55, 93),
            tech_affinity=random.uniform(0, 5)
        )
        soc.agents[a.id] = a
        soc.next_id += 1
    soc.log(f"Initial population of {n} early post-dinosaur mammals established.")

def age_and_die(soc: Society):
    dead = []
    for a in list(soc.agents.values()):
        if not a.alive:
            continue
        age = a.age(soc.year)
        death_chance = 0.0016 + (age / 112)**3 * 0.13
        death_chance *= max(0.22, 1.18 - soc.tech_level * 0.048)
        death_chance *= max(0.35, 1.28 - a.health / 145)
        if random.random() < death_chance or age > 110:
            a.alive = False
            dead.append(a.id)
            soc.total_deaths += 1
            if a.married_to is not None and a.married_to in soc.agents:
                soc.agents[a.married_to].married_to = None
    for did in dead:
        del soc.agents[did]

def form_marriages(soc: Society):
    singles = [a for a in soc.agents.values()
               if a.alive and a.married_to is None and 15 <= a.age(soc.year) <= 55]
    random.shuffle(singles)
    males = [a for a in singles if a.sex == 'M']
    females = [a for a in singles if a.sex == 'F']

    for m in males:
        if not females:
            break
        best, best_score = None, -999
        for f in females[:min(12, len(females))]:
            score = -abs(m.sociality - f.sociality) * 0.4
            score -= abs(m.intelligence - f.intelligence) * 0.25
            score += (m.sociality + f.sociality) * 0.15
            score += (m.libido + f.libido) * 0.05
            score += random.uniform(-10, 10)
            if score > best_score:
                best_score, best = score, f
        if best and best_score > -20 and random.random() < 0.48 + soc.tech_level * 0.02:
            m.married_to = best.id
            best.married_to = m.id
            soc.marriages += 1
            females.remove(best)

def have_sex_and_babies(soc: Society):
    """Sex happens. Married couples have regular sex. Some loners have casual sex."""
    alive = [a for a in soc.agents.values() if a.alive]
    random.shuffle(alive)

    # 1. Married sex
    for a in alive:
        if a.sex != 'F' or a.married_to is None:
            continue
        partner = soc.agents.get(a.married_to)
        if not partner or not partner.alive:
            continue

        age_f = a.age(soc.year)
        age_m = partner.age(soc.year)
        if not (15 <= age_f <= 48 and 15 <= age_m <= 65):
            continue

        # Desire based on libido, health, and how long since last sex
        years_since = soc.year - max(a.last_sex_year, partner.last_sex_year)
        desire = (a.libido + partner.libido) / 2
        desire *= (a.health + partner.health) / 180
        desire *= min(2.5, 0.6 + years_since * 0.15)

        if random.random() < desire / 140:
            # They have sex
            a.last_sex_year = soc.year
            partner.last_sex_year = soc.year
            soc.sexual_encounters += 1

            # Chance of pregnancy (lower with higher tech = better contraception/knowledge)
            preg_chance = 0.22 - soc.tech_level * 0.012
            preg_chance *= (a.health / 90)
            if random.random() < preg_chance and len(soc.agents) < MAX_AGENTS * 1.2:
                child = Agent(
                    id=soc.next_id,
                    birth_year=soc.year,
                    sex=random.choice(['M', 'F']),
                    intelligence=mutate((a.intelligence + partner.intelligence) / 2, 5.5),
                    aggression=mutate((a.aggression + partner.aggression) / 2, 6),
                    sociality=mutate((a.sociality + partner.sociality) / 2, 5.5),
                    libido=mutate((a.libido + partner.libido) / 2, 7),
                    health=mutate((a.health + partner.health) / 2 + 3, 7),
                    tech_affinity=mutate((a.tech_affinity + partner.tech_affinity) / 2, 3.8)
                )
                soc.agents[child.id] = child
                a.children.append(child.id)
                partner.children.append(child.id)
                soc.next_id += 1
                soc.total_births += 1

    # 2. Casual sex among loners / unmarried (lower chance)
    unmarried = [a for a in alive if a.married_to is None and 16 <= a.age(soc.year) <= 50]
    random.shuffle(unmarried)
    for i in range(0, len(unmarried) - 1, 2):
        a1, a2 = unmarried[i], unmarried[i + 1]
        if a1.sex == a2.sex:
            continue
        if a1.sex == 'M':
            male, female = a1, a2
        else:
            male, female = a2, a1

        desire = (male.libido + female.libido) / 2 * 0.55
        desire *= (male.sociality + female.sociality) / 160
        if random.random() < desire / 160:
            male.last_sex_year = soc.year
            female.last_sex_year = soc.year
            soc.sexual_encounters += 1

            preg_chance = 0.11 - soc.tech_level * 0.008
            if random.random() < preg_chance and len(soc.agents) < MAX_AGENTS * 1.15:
                child = Agent(
                    id=soc.next_id,
                    birth_year=soc.year,
                    sex=random.choice(['M', 'F']),
                    intelligence=mutate((male.intelligence + female.intelligence) / 2, 6),
                    aggression=mutate((male.aggression + female.aggression) / 2, 7),
                    sociality=mutate((male.sociality + female.sociality) / 2, 6),
                    libido=mutate((male.libido + female.libido) / 2, 8),
                    health=mutate((male.health + female.health) / 2, 8),
                    tech_affinity=mutate((male.tech_affinity + female.tech_affinity) / 2, 4)
                )
                soc.agents[child.id] = child
                soc.next_id += 1
                soc.total_births += 1

def update_loners(soc: Society):
    count = 0
    for a in soc.agents.values():
        if a.alive and a.married_to is None and a.age(soc.year) > 26:
            a.is_loner = True
            count += 1
            if a.sociality > 60 and a.libido > 55:
                a.health = max(15, a.health - 0.6)  # lonely + high desire hurts a bit
        else:
            a.is_loner = False
    soc.loners = count

def advance_technology(soc: Society):
    if not soc.agents:
        return
    alive = [a for a in soc.agents.values() if a.alive]
    avg_int = sum(a.intelligence for a in alive) / len(alive)
    avg_aff = sum(a.tech_affinity for a in alive) / len(alive)
    pop = len(alive)

    progress = (avg_int / 80) * (avg_aff / 30) * math.log10(pop + 10) * 0.011
    progress *= (1.0 + random.uniform(-0.3, 0.4))
    old = soc.tech_level
    soc.tech_level = min(14.2, soc.tech_level + progress)

    if int(old) < int(soc.tech_level):
        soc.log(f"*** TECHNOLOGICAL LEAP → {tech_name(soc.tech_level)} ***")

    if soc.tech_level >= 1.0 and soc.weapons < 1:
        soc.weapons = 4
        soc.log("Simple tools and weapons appear.")
    if soc.tech_level >= 2.6 and soc.houses < 1:
        soc.houses = 10
        soc.log("First permanent shelters / houses built.")
    if soc.tech_level >= 4.8:
        soc.houses = max(soc.houses, int(pop * 0.4))
    if soc.tech_level >= 6.5:
        soc.weapons = max(soc.weapons, int(pop * 0.25))
    if soc.tech_level >= 8.5:
        soc.houses = max(soc.houses, int(pop * 0.8))
        soc.weapons = max(soc.weapons, int(pop * 0.5))

def evolve_politics(soc: Society):
    if soc.tech_level < 3.0:
        soc.political_system = "Bands / Kin groups"
    elif soc.tech_level < 5.0:
        soc.political_system = "Tribes / Chiefdoms"
    elif soc.tech_level < 7.0:
        soc.political_system = "Early States / Kingdoms"
    elif soc.tech_level < 9.5:
        avg = sum(a.political_lean for a in soc.agents.values() if a.alive) / max(1, len(soc.agents))
        if abs(avg) < 0.2:
            soc.political_system = "Constitutional / Mixed systems"
        elif avg > 0.15:
            soc.political_system = "Authoritarian / Strong-state"
        else:
            soc.political_system = "Liberal / Democratic experiments"
    elif soc.tech_level < 12:
        soc.political_system = "Globalized nation-states + corporations"
    else:
        soc.political_system = "Post-national / AI-influenced systems"

def disasters(soc: Society):
    if random.random() < 0.03:
        severity = random.uniform(0.07, 0.35) * max(0.25, 1.2 - soc.tech_level * 0.06)
        deaths = 0
        for a in list(soc.agents.values()):
            if a.alive and random.random() < severity * (1.2 - a.health / 140):
                a.alive = False
                deaths += 1
                soc.total_deaths += 1
        if deaths:
            soc.disasters += 1
            soc.log(f"Disaster struck — {deaths} dead (tech reduced the toll)")

def soft_cap(soc: Society):
    if len(soc.agents) > MAX_AGENTS:
        excess = len(soc.agents) - MAX_AGENTS
        cands = [a for a in soc.agents.values() if a.alive]
        random.shuffle(cands)
        for a in cands[:excess]:
            a.alive = False
            soc.total_deaths += 1
        soc.agents = {k: v for k, v in soc.agents.items() if v.alive}

def print_status(soc: Society):
    alive = [a for a in soc.agents.values() if a.alive]
    if not alive:
        print("Population extinct.")
        return
    pop = len(alive)
    avg_int = sum(a.intelligence for a in alive) / pop
    avg_age = sum(a.age(soc.year) for a in alive) / pop
    married = sum(1 for a in alive if a.married_to is not None) // 2
    loners = sum(1 for a in alive if a.is_loner)

    print(f"\n── Year {soc.year:+,} ──  Population: {pop}")
    print(f"  Married pairs: {married}   |  Loners: {loners}")
    print(f"  Sexual encounters so far: {soc.sexual_encounters}")
    print(f"  Avg Intelligence: {avg_int:.1f}   Avg Age: {avg_age:.1f}")
    print(f"  Tech Level: {soc.tech_level:.2f}  ({tech_name(soc.tech_level)})")
    print(f"  Houses: {soc.houses}   Weapons: {soc.weapons}")
    print(f"  Political system: {soc.political_system}")
    print(f"  Total births / deaths: {soc.total_births} / {soc.total_deaths}")
    print("─" * 50)

# ============================================================
# MAIN LOOP
# ============================================================
def run():
    soc = Society()
    create_initial_population(soc)

    print("\n>>> Fast-forwarding deep time after the dinosaurs...")
    print("    Real-time mode (10 years per minute) begins at year -300,000\n")

    last_print = soc.year

    while soc.year < END_YEAR:
        if soc.year < HUMAN_ERA_START:
            # Fast deep time
            if soc.year < -2_000_000:
                step = 80_000
            elif soc.year < -800_000:
                step = 20_000
            else:
                step = 4_000
            sleep = 0.12
        else:
            # Real-time: 10 years every 60 real seconds
            step = YEARS_PER_MINUTE
            sleep = REAL_SECONDS_PER_STEP

        soc.year += step

        age_and_die(soc)
        form_marriages(soc)
        have_sex_and_babies(soc)          # ← sex + possible babies
        update_loners(soc)
        advance_technology(soc)
        evolve_politics(soc)
        disasters(soc)
        soft_cap(soc)

        # Printing
        if soc.year < HUMAN_ERA_START:
            if abs(soc.year - last_print) >= 150_000:
                print_status(soc)
                last_print = soc.year
        else:
            print_status(soc)
            last_print = soc.year

        if not soc.agents:
            print("\n*** EXTINCTION EVENT ***")
            break

        time.sleep(sleep)

    print("\n" + "=" * 60)
    print("SIMULATION COMPLETE")
    print("=" * 60)
    print_status(soc)
    print("\nRecent history:")
    for entry in soc.history[-20:]:
        print(" ", entry)

if __name__ == "__main__":
    print("Human Evolution Simulator — from post-dinosaur world to the future")
    print("Includes sex, marriage, babies, loners, tech, weapons, houses & politics\n")
    run()
