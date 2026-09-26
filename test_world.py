import json
import tempfile
import unittest
from pathlib import Path

from world import World


class WorldTests(unittest.TestCase):
    def test_world_persists_and_grows(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            world = World(Path(directory))
            for _ in range(32):
                world.advance()
            state = world.snapshot()

            self.assertEqual(state["tick"], 32)
            self.assertIn("enquête", state["earth"]["species"])
            self.assertGreater(state["air"]["signals"], 0)
            self.assertGreater(state["fire"]["accepted"], 0)
            self.assertTrue((Path(directory) / "state.json").exists())
            self.assertTrue((Path(directory) / "events.jsonl").exists())

            restored = World(Path(directory))
            self.assertEqual(restored.snapshot()["tick"], 32)
            self.assertEqual(json.loads((Path(directory) / "state.json").read_text())["tick"], 32)


if __name__ == "__main__":
    unittest.main()
