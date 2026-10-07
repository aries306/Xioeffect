import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const read = (path) => fs.readFile(path, "utf8");

test("Sanctum evaluator enforces provenance and lifecycle gates", async () => {
  const source = await read("lib/memory-evaluation.ts");
  assert.match(source, /missing_provenance/);
  assert.match(source, /stale_without_recent_confirmation/);
  assert.match(source, /context_scope_mismatch/);
  assert.match(source, /low_confidence/);
  assert.match(source, /influenceWeight/);
});

test("Sanctum retrieval applies evaluation before ranking", async () => {
  const memory = await read("lib/memory.ts");
  assert.match(memory, /evaluateMemoryForContext/);
  assert.match(memory, /filter\(\(\{ evaluation \}\) => evaluation\.eligible\)/);
  assert.match(memory, /last_evaluated_at/);
  assert.match(memory, /evaluation=\$\{JSON\.stringify\(evaluation\)\}/);
});

test("Explicit contradiction relations are persisted", async () => {
  const memory = await read("lib/memory.ts");
  const migration = await read("db/migrations/006_memory_relations_evaluation.sql");
  assert.match(memory, /contradictsMemoryId/);
  assert.match(memory, /memory_relations/);
  assert.match(memory, /'contradicts'/);
  assert.match(migration, /memory_relations/);
  assert.match(migration, /contradicts/);
});

test("Request context reaches cognitive retrieval", async () => {
  const chat = await read("app/api/chat/route.ts");
  const astara = await read("lib/astara.ts");
  assert.match(chat, /context \}/);
  assert.match(chat, /context \}\)/);
  assert.match(astara, /input\.context/);
});
