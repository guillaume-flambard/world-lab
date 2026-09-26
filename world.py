from __future__ import annotations

import json
import os
import threading
import time
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


SEASONS = ("exploration", "croissance", "récolte", "repos")
PHASES = ("air", "eau", "feu", "terre")


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def initial_state() -> dict[str, Any]:
    return {
        "world_id": "world-lab-earth-1",
        "tick": 0,
        "season": "exploration",
        "status": "starting",
        "started_at": now(),
        "updated_at": now(),
        "climate": {"temperature": 0.18, "pressure": 0.12, "entropy": 0.08},
        "air": {"signals": 0, "views": 0, "distinct_events": 0},
        "water": {"clouds": 0, "dreams": [], "belief_tensions": 0},
        "fire": {"attempted": 0, "accepted": 0, "refused": 0},
        "earth": {
            "energy": 10,
            "species": ["observation", "question", "preuve", "croyance", "rêve"],
            "receipts": 0,
        },
        "beings": {
            "root-tree": {
                "name": "Arbre racine",
                "kind": "artefact",
                "archetype": "arbre",
                "phase": "terre",
                "health": 0.72,
                "agency": {"percevoir": 0.3, "mémoriser": 1.0, "choisir": 0.1, "agir": 0.1, "apprendre": 0.2, "refuser": 0.8},
                "where": "Jardin nord",
                "why": "Conserver la mémoire fondatrice du World",
                "origin": ["Besoin", "Conversation", "Graine de spec", "Genèse"],
                "becoming": "Un contrat vivant",
                "relations": ["gardener", "rootkeepers", "watchers"],
            },
            "river-stone": {
                "name": "Caillou de rivière",
                "kind": "artefact",
                "archetype": "caillou",
                "phase": "terre",
                "health": 1.0,
                "agency": {"percevoir": 0.1, "mémoriser": 0.8, "choisir": 0.0, "agir": 0.0, "apprendre": 0.0, "refuser": 0.2},
                "where": "Rivière des preuves",
                "why": "Porter une mémoire minérale",
                "origin": ["Grès", "Sable", "Quartz", "Genèse connue"],
                "becoming": "Une poussière future",
                "relations": ["watchers"],
            },
            "gardener": {
                "name": "Jardinier",
                "kind": "agent",
                "archetype": "jardinier",
                "phase": "feu",
                "health": 0.66,
                "energy": 4,
                "agency": {"percevoir": 0.8, "mémoriser": 0.6, "choisir": 0.7, "agir": 0.8, "apprendre": 0.5, "refuser": 0.6},
                "where": "Atelier du Feu",
                "why": "Soigner sans posséder",
                "origin": ["Besoin de soin", "Capacité care", "Genèse"],
                "becoming": "Un habitant temporaire",
                "relations": ["root-tree", "watchers"],
            },
            "rootkeepers": {
                "name": "Gardiens des racines",
                "kind": "communauté",
                "archetype": "forêt",
                "phase": "eau",
                "health": 0.82,
                "belief": "L'arbre ne doit pas devenir une simple ressource.",
                "sacred": ["root-tree"],
                "where": "Bois ancien",
                "why": "Préserver la continuité",
                "origin": ["Alliance", "Premier récit", "Genèse"],
                "becoming": "Une tradition qui doute",
                "relations": ["root-tree", "harvesters", "watchers"],
            },
            "harvesters": {
                "name": "Récolteurs",
                "kind": "communauté",
                "archetype": "champ",
                "phase": "eau",
                "health": 0.74,
                "belief": "La transformation est juste si elle nourrit le monde.",
                "sacred": [],
                "where": "Plaine orientale",
                "why": "Transformer les ressources",
                "origin": ["Famine", "Premier outil", "Genèse"],
                "becoming": "Une économie du renouvellement",
                "relations": ["rootkeepers", "watchers"],
            },
            "watchers": {
                "name": "Veilleurs",
                "kind": "communauté",
                "archetype": "nuage",
                "phase": "air",
                "health": 0.77,
                "belief": "Une preuve forte vaut mieux qu'une certitude partagée.",
                "sacred": ["doute"],
                "where": "Haute atmosphère",
                "why": "Observer sans confondre regard et réalité",
                "origin": ["Contradiction", "Question", "Genèse"],
                "becoming": "Une école de l'incertitude",
                "relations": ["root-tree", "river-stone", "gardener"],
            },
        },
        "patterns": {},
        "last_event": None,
        "bulletin": "Le World se réveille.",
    }


class World:
    def __init__(self, data_dir: Path) -> None:
        self.data_dir = data_dir
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.state_path = data_dir / "state.json"
        self.events_path = data_dir / "events.jsonl"
        self.lock = threading.RLock()
        self.stop_event = threading.Event()
        if self.state_path.exists():
            self.state = json.loads(self.state_path.read_text(encoding="utf-8"))
        else:
            self.state = initial_state()
            self.record("terre", "genèse", "world", {"laws_version": 1})
            self.persist()

    def record(self, phase: str, species: str, actor: str, payload: dict[str, Any]) -> None:
        event = {
            "event_id": f"event-{self.state['tick']:09d}-{species}",
            "tick": self.state["tick"],
            "time": now(),
            "phase": phase,
            "species": species,
            "actor": actor,
            "payload": payload,
        }
        with self.events_path.open("a", encoding="utf-8") as stream:
            stream.write(json.dumps(event, ensure_ascii=False, sort_keys=True) + "\n")
            stream.flush()
            os.fsync(stream.fileno())
        self.state["last_event"] = event

    def persist(self) -> None:
        temporary = self.state_path.with_suffix(".tmp")
        temporary.write_text(json.dumps(self.state, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        os.replace(temporary, self.state_path)

    def observe(self) -> None:
        air = self.state["air"]
        air["signals"] += 1
        air["views"] += 1
        if air["views"] % 2:
            air["distinct_events"] += 1
        actor = "watchers" if air["views"] % 2 else "rootkeepers"
        self.record("air", "observation", actor, {
            "subject": "root-tree",
            "views": air["views"],
            "distinct_events": air["distinct_events"],
            "observer_bias": round(air["views"] / max(1, air["distinct_events"]), 2),
        })

    def make_cloud(self) -> None:
        pattern = "observation+preuve+question"
        occurrences = self.state["patterns"].get(pattern, 0) + 1
        self.state["patterns"][pattern] = occurrences
        self.state["water"]["clouds"] += 1
        self.record("eau", "nuage-enquête", "watchers", {"pattern": pattern, "occurrences": occurrences})
        if occurrences == 3 and "enquête" not in self.state["earth"]["species"]:
            self.state["earth"]["species"].append("enquête")
            self.record("terre", "naissance-espèce", "constitution", {
                "name": "enquête",
                "from": pattern,
                "old_readers": "préservé-opaque",
            })

    def dream(self) -> None:
        futures = (
            ("soin", "L'arbre guérit lentement sans être détruit."),
            ("récolte", "Une branche devient de l'énergie, le tronc demeure."),
            ("migration", "La mémoire de l'arbre produit une bouture portable."),
        )
        name, story = futures[len(self.state["water"]["dreams"]) % len(futures)]
        dream = {"id": f"dream-{self.state['tick']}", "kind": name, "story": story, "born_at": self.state["tick"]}
        self.state["water"]["dreams"].append(dream)
        self.record("eau", "rêve-né", "gardener", dream)

    def beliefs(self) -> None:
        self.state["water"]["belief_tensions"] += 1
        self.record("eau", "tension-croyances", "communities", {
            "shared_reality": "damage-marker-present",
            "knowledge": "l'arbre demande un soin",
            "beliefs": {
                "rootkeepers": "préserver",
                "harvesters": "transformer avec consentement",
                "watchers": "attendre une preuve supplémentaire",
            },
        })

    def ignite(self) -> None:
        fire = self.state["fire"]
        gardener = self.state["beings"]["gardener"]
        fire["attempted"] += 1
        if gardener["energy"] < 2 or self.state["season"] == "repos" or not self.state["water"]["dreams"]:
            fire["refused"] += 1
            self.record("terre", "feu-refusé", "world", {"reason": "limite écologique", "earth_changed": False})
            return
        selected = self.state["water"]["dreams"].pop(0)
        before = self.state["beings"]["root-tree"]["health"]
        self.record("feu", "soin", "gardener", {"dream": selected["id"], "energy_cost": 2})
        gardener["energy"] -= 2
        after = min(1.0, round(before + 0.025, 3))
        self.state["beings"]["root-tree"]["health"] = after
        self.state["earth"]["receipts"] += 1
        fire["accepted"] += 1
        self.record("terre", "reçu-transformation", "world", {"before": before, "after": after, "dream": selected["id"]})

    def rest(self) -> None:
        gardener = self.state["beings"]["gardener"]
        before = gardener["energy"]
        gardener["energy"] = min(6, gardener["energy"] + 1)
        composted = None
        if len(self.state["water"]["dreams"]) > 12:
            composted = self.state["water"]["dreams"].pop(0)
        self.record("terre", "repos", "gardener", {
            "energy_before": before,
            "energy_after": gardener["energy"],
            "composted_dream": composted and composted["id"],
        })

    def wave(self) -> None:
        amplitude = max(0.08, round(1 / (1 + self.state["water"]["belief_tensions"] * 0.12), 2))
        self.record("air", "vague", "root-tree", {
            "path": ["root-tree", "gardener", "watchers", "harvesters"],
            "amplitude_at_edge": amplitude,
        })

    def advance(self) -> None:
        with self.lock:
            self.state["tick"] += 1
            tick = self.state["tick"]
            self.state["season"] = SEASONS[((tick - 1) // 24) % len(SEASONS)]
            step = tick % 8
            if step in (1, 2):
                self.observe()
            elif step == 3:
                self.make_cloud()
            elif step == 4:
                self.dream()
            elif step == 5:
                self.beliefs()
            elif step == 6:
                self.ignite()
            elif step == 7:
                self.wave()
            else:
                self.rest()
            self.update_climate()
            self.state["status"] = "running"
            self.state["updated_at"] = now()
            self.state["bulletin"] = self.make_bulletin()
            self.persist()

    def update_climate(self) -> None:
        dreams = len(self.state["water"]["dreams"])
        tensions = self.state["water"]["belief_tensions"]
        accepted = self.state["fire"]["accepted"]
        refused = self.state["fire"]["refused"]
        self.state["climate"] = {
            "temperature": round(min(1, 0.12 + accepted * 0.018), 2),
            "pressure": round(min(1, dreams / 18), 2),
            "entropy": round(min(1, (tensions + refused) / 40), 2),
        }

    def make_bulletin(self) -> str:
        tree = self.state["beings"]["root-tree"]
        dreams = len(self.state["water"]["dreams"])
        fire = self.state["fire"]
        species = " L'espèce enquête est née." if "enquête" in self.state["earth"]["species"] else ""
        return (
            f"Saison {self.state['season']}. L'arbre racine vit à {tree['health']:.2f}. "
            f"L'Air porte {self.state['air']['signals']} signaux. L'Eau garde {dreams} futurs. "
            f"Le Feu a transformé {fire['accepted']} fois et refusé {fire['refused']} fois.{species}"
        )

    def snapshot(self) -> dict[str, Any]:
        with self.lock:
            return deepcopy(self.state)

    def recent_events(self, limit: int = 60) -> list[dict[str, Any]]:
        with self.lock:
            if not self.events_path.exists():
                return []
            lines = self.events_path.read_text(encoding="utf-8").splitlines()
            return [json.loads(line) for line in lines[-max(1, min(limit, 200)):]]

    def run(self, interval: float = 2.0) -> None:
        while not self.stop_event.wait(interval):
            self.advance()

    def stop(self) -> None:
        self.stop_event.set()

