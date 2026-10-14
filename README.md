#!/usr/bin/env python3
"""
Real-life Human Evolution Simulation
From the age of dinosaurs → modern civilization → near future
Simplified but stage-accurate model with stochastic events.
"""

import time
import random
from dataclasses import dataclass, field
from typing import List, Optional

@dataclass
class WorldState:
    year: int = -100_000_000          # negative = years before present
    species: str = "Non-avian dinosaurs dominate"
    population: float = 1e9           # rough global biomass proxy early on
    tech_level: float = 0.0           # 0–12+ scale
    social: str = "Ecosystems / herds"
    housing: str = "None (wild)"
    politics: str = "None"
    weapons: str = "Teeth, claws, size"
    key_tech: List[str] = field(default_factory=list)
    events_log: List[str] = field(default_factory=list)
    extinction_risk: float = 0.1
    intelligence: float = 0.1         # relative cognitive capacity
    energy: float = 0.0               # available useful energy (fire → fossil → nuclear → fusion…)

    def age_str(self) -> str:
        if self.year < 0:
            mya = abs(self.year) / 1_000_000
            if mya >= 1:
                return f"{mya:.1f} million years ago"
            kya = abs(self.year) / 1_000
            return f"{kya:.0f} thousand years ago"
        return f"Year {self.year} CE"


class EvolutionSimulator:
    def __init__(self, seed: Optional[int] = None):
        if seed is not None:
            random.seed(seed)
        self.state = WorldState()
        self.running = True
        self.step_count = 0

    def log(self, msg: str):
        entry = f"[{self.state.age_str()}] {msg}"
        self.state.events_log.append(entry)
        print(entry)

    def advance_time(self):
        """Adaptive time steps – huge jumps early, finer later."""
        y = self.state.year
        if y < -10_000_000:
            delta = random.randint(500_000, 2_000_000)
        elif y < -1_000_000:
            delta = random.randint(50_000, 200_000)
        elif y < -50_000:
            delta = random.randint(2_000, 10_000)
        elif y < -5_000:
            delta = random.randint(200, 800)
        elif y < 0:
            delta = random.randint(50, 200)
        elif y < 1800:
            delta = random.randint(20, 80)
        elif y < 1950:
            delta = random.randint(5, 20)
        else:
            delta = random.randint(1, 5)

        self.state.year += delta
        self.step_count += 1

    def apply_stage_transitions(self):
        s = self.state
        y = s.year

        # --- Deep time ---
        if y > -66_000_000 and "Non-avian dinosaurs" in s.species:
            s.species = "Mammals radiate after K-Pg extinction"
            s.population = 5e7
            s.log("Chicxulub impact and Deccan volcanism wipe out non-avian dinosaurs. Mammals inherit the Earth.")
            s.extinction_risk = 0.05

        if y > -55_000_000 and s.intelligence < 0.3:
            s.species = "Early primates appear"
            s.intelligence = 0.3
            s.log("Primates evolve in the trees of the Eocene. Grasping hands and better vision.")

        if y > -7_000_000 and "hominin" not in s.species.lower():
            s.species = "Early hominins (Sahelanthropus / Orrorin lineage)"
            s.intelligence = 0.6
            s.population = 5e4
            s.log("Hominin line splits from chimpanzees. Bipedalism begins.")

        if y > -3_500_000:
            s.species = "Australopithecus"
            s.intelligence = 0.8
            s.log("Australopithecus walks fully upright on the African savanna.")

        if y > -2_500_000:
            s.species = "Homo habilis / early Homo"
            s.tech_level = 0.5
            s.key_tech.append("Oldowan stone tools")
            s.weapons = "Stone flakes, clubs"
            s.log("First stone tools. Scavenging and simple butchery.")

        if y > -1_800_000:
            s.species = "Homo erectus"
            s.tech_level = 1.2
            s.key_tech.append("Acheulean handaxes")
            s.key_tech.append("Controlled use of fire (later)")
            s.housing = "Simple shelters / caves"
            s.intelligence = 1.4
            s.population = 1e5
            s.log("Homo erectus expands out of Africa. Fire mastery begins transforming diet and social life.")

        if y > -300_000:
            s.species = "Homo sapiens (archaic → modern)"
            s.tech_level = 2.0
            s.intelligence = 2.5
            s.key_tech.append("Levallois technique / composite tools")
            s.log("Anatomically modern humans appear in Africa.")

        if y > -70_000:
            s.tech_level = 2.8
            s.key_tech.append("Symbolic thought / art / language fully modern")
            s.social = "Hunter-gatherer bands"
            s.log("Behavioral modernity. Art, ritual, complex language. Out-of-Africa migrations accelerate.")

        if y > -12_000:
            s.tech_level = 3.5
            s.key_tech.append("Agriculture & animal domestication")
            s.housing = "Permanent villages"
            s.social = "Tribes → early chiefdoms"
            s.population = 5e6
            s.weapons = "Bows, spears, early fortifications"
            s.log("Neolithic Revolution. Farming begins in multiple centers. Population boom starts.")

        if y > -5_000:
            s.tech_level = 4.5
            s.key_tech.extend(["Writing", "Bronze metallurgy", "Cities"])
            s.housing = "Mud-brick / stone cities"
            s.social = "City-states & early empires"
            s.politics = "God-kings, priestly hierarchies, early law codes"
            s.weapons = "Bronze weapons, chariots"
            s.population = 5e7
            s.log("Urban revolution. Writing, metallurgy, and the first states appear (Mesopotamia, Egypt, Indus, China…).")

        if y > -1_200:
            s.tech_level = 5.2
            s.key_tech.append("Iron Age")
            s.weapons = "Iron weapons, early cavalry tactics"
            s.log("Iron spreads. Larger armies and more destructive warfare possible.")

        if y > 500:
            s.tech_level = 5.8
            s.key_tech.append("Gunpowder (China → world)")
            s.weapons = "Gunpowder weapons begin"
            s.log("Gunpowder changes the calculus of fortifications and battle.")

        if y > 1450:
            s.tech_level = 6.5
            s.key_tech.extend(["Printing press", "Ocean-going ships", "Early scientific method"])
            s.politics = "Emerging nation-states & colonial empires"
            s.housing = "Multi-story buildings, early urban planning"
            s.log("Age of Exploration + Renaissance science. Global connections begin.")

        if y > 1750:
            s.tech_level = 7.5
            s.key_tech.extend(["Steam power", "Industrial manufacturing", "Fossil fuels"])
            s.energy = 3.0
            s.population = 1e9
            s.housing = "Industrial cities, tenements, early suburbs"
            s.weapons = "Rifled guns, artillery, early machine guns"
            s.politics = "Nation-states, liberalism, nationalism, early socialism"
            s.log("Industrial Revolution. Energy and production explode. Urbanization accelerates.")

        if y > 1900:
            s.tech_level = 8.5
            s.key_tech.extend(["Electricity", "Internal combustion", "Radio", "Aircraft"])
            s.weapons = "Machine guns, tanks, aircraft, chemical weapons"
            s.log("Second Industrial Revolution. Global wars become possible.")

        if y > 1945:
            s.tech_level = 9.2
            s.key_tech.extend(["Nuclear weapons", "Computers (early)", "Antibiotics", "Green Revolution"])
            s.weapons = "Nuclear arsenals + conventional precision"
            s.politics = "Cold War bipolar order → later multipolar"
            s.energy = 6.0
            s.population = 2.5e9
            s.log("Nuclear age begins. Computing and modern medicine transform life expectancy and power.")

        if y > 1990:
            s.tech_level = 9.8
            s.key_tech.extend(["Internet", "Mobile computing", "Genomics", "GPS"])
            s.housing = "Global urban majority, skyscrapers, sprawl"
            s.politics = "Liberal international order under strain; rising multipolarity"
            s.population = 6e9
            s.log("Information age. Instant global communication and data.")

        if y > 2020:
            s.tech_level = 10.3
            s.key_tech.extend(["AI systems", "mRNA platforms", "Renewable energy surge", "Reusable rocketry"])
            s.weapons = "Precision munitions, drones, cyber, nuclear triad"
            s.politics = "Great-power competition + domestic polarization"
            s.population = 8e9
            s.energy = 7.5
            s.log("Present day: AI, climate pressure, and renewed great-power rivalry.")

        # --- Future projections (stochastic) ---
        if y > 2035 and s.tech_level < 11:
            if random.random() < 0.6:
                s.tech_level = 11.0
                s.key_tech.append("Advanced AI + robotics at scale")
                s.log("AI systems begin transforming labor, science, and military affairs.")
            if random.random() < 0.4:
                s.key_tech.append("Commercial fusion or advanced fission breakthroughs")
                s.energy = 9.0
                s.log("Clean dense energy sources start to scale.")

        if y > 2050:
            s.tech_level = min(s.tech_level + 0.3, 12.5)
            if "Climate adaptation / geoengineering debates" not in s.key_tech:
                s.key_tech.append("Climate adaptation infrastructure")
            if random.random() < 0.5:
                s.housing = "Mixed: dense cities + climate-resilient new towns + orbital habitats (early)"
            if random.random() < 0.35:
                s.key_tech.append("Permanent lunar / Martian footholds")
                s.log("Human presence becomes multi-planetary (small scale).")

        if y > 2100:
            s.population = min(s.population * random.uniform(0.9, 1.15), 12e9)
            s.politics = random.choice([
                "Fragmented multipolar world with strong AI governance bodies",
                "Loose global coordination regimes + powerful corporate/AI actors",
                "Regional blocs with high-tech surveillance states",
                "Partial collapse zones + high-tech enclaves"
            ])
            s.weapons = "Hypersonics, autonomous systems, directed energy, residual nuclear, cyber-biological"
            if random.random() < 0.3:
                s.log("Major demographic or climate-driven migration crises reshape politics.")
            if random.random() < 0.25:
                s.log("Breakthrough in longevity or cognitive enhancement technologies.")

    def random_event(self):
        s = self.state
        y = s.year
        r = random.random()

        if y < -50_000_000 and r < 0.08:
            s.log("Major volcanic or asteroid event perturbs climate.")
        elif -300_000 < y < -20_000 and r < 0.12:
            s.log(random.choice([
                "Glacial maximum stresses populations; innovation in clothing and shelter.",
                "Inter-group conflict over resources increases.",
                "New hunting techniques or symbolic culture spreads."
            ]))
        elif -10_000 < y < 0 and r < 0.15:
            s.log(random.choice([
                "Agricultural package spreads to a new region.",
                "Early state formation or collapse in a river valley.",
                "Metallurgical innovation or trade network expands."
            ]))
        elif 0 < y < 1800 and r < 0.18:
            s.log(random.choice([
                "Empire rises or fragments.",
                "Pandemic sweeps trade routes.",
                "Religious or philosophical movement reshapes politics.",
                "Gunpowder empire expands."
            ]))
        elif 1800 < y < 1950 and r < 0.2:
            s.log(random.choice([
                "Industrial war kills millions and accelerates technology.",
                "Political revolution installs new ideology.",
                "Scientific breakthrough (germ theory, electromagnetism, etc.)."
            ]))
        elif y > 1950 and r < 0.22:
            events = [
                "Proxy wars and nuclear brinkmanship.",
                "Rapid economic growth in multiple regions.",
                "Environmental movement gains force.",
                "Digital networks reorganize information and power.",
                "Great-power competition intensifies over tech and resources.",
                "Public-health or climate shock tests institutions."
            ]
            s.log(random.choice(events))

        # Population pressure / carrying capacity rough feedback
        if s.tech_level < 4 and s.population > 1e8:
            s.population *= 0.95
        if s.tech_level > 8 and random.random() < 0.1:
            s.population *= random.uniform(1.01, 1.04)

    def status_snapshot(self):
        s = self.state
        print("\n" + "="*70)
        print(f"YEAR: {s.age_str()}")
        print(f"Species / era focus : {s.species}")
        print(f"Population (approx) : {s.population:,.0f}")
        print(f"Tech level          : {s.tech_level:.1f}")
        print(f"Intelligence proxy  : {s.intelligence:.1f}")
        print(f"Social organization : {s.social}")
        print(f"Politics            : {s.politics}")
        print(f"Housing / settlement: {s.housing}")
        print(f"Weapons             : {s.weapons}")
        print(f"Key technologies    : {', '.join(s.key_tech[-6:]) if s.key_tech else 'None yet'}")
        print("="*70 + "\n")

    def run(self, max_steps: int = 80, delay: float = 0.35, verbose_every: int = 1):
        print("=== HUMAN EVOLUTION & CIVILIZATION SIMULATION ===")
        print("Starting in the age of dinosaurs…\n")
        time.sleep(1)

        while self.running and self.step_count < max_steps and self.state.year < 2200:
            self.advance_time()
            self.apply_stage_transitions()
            self.random_event()

            if self.step_count % verbose_every == 0:
                self.status_snapshot()

            # Small chance of early termination by catastrophe (very rare after mammals)
            if self.state.year < -50_000_000 and random.random() < 0.02:
                self.log("Catastrophic extinction event – simulation ends.")
                break

            time.sleep(delay)

        print("\n=== SIMULATION COMPLETE ===")
        print(f"Final year reached: {self.state.age_str()}")
        print(f"Final tech level: {self.state.tech_level:.1f}")
        print(f"Final political form: {self.state.politics}")
        print("\nMajor technologies unlocked:")
        for t in self.state.key_tech:
            print(f"  • {t}")


if __name__ == "__main__":
    # Change seed for different random histories; None = different every run
    sim = EvolutionSimulator(seed=42)
    sim.run(max_steps=100, delay=0.25, verbose_every=1)
