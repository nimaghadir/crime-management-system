import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

function initialNodeMap(evidence = [], suspects = []) {
  const map = {};
  evidence.forEach((item, idx) => {
    map[`e-${item.id}`] = { x: 40 + (idx % 3) * 220, y: 60 + Math.floor(idx / 3) * 130 };
  });
  suspects.forEach((item, idx) => {
    map[`s-${item.id}`] = { x: 500 + (idx % 2) * 240, y: 80 + Math.floor(idx / 2) * 140 };
  });
  return map;
}

export function DetectiveBoardPage() {
  const { token } = useAuth();
  const [caseId, setCaseId] = useState("");
  const [board, setBoard] = useState(null);
  const [error, setError] = useState("");
  const [nodePos, setNodePos] = useState({});
  const [relationForm, setRelationForm] = useState({
    source_evidence: "",
    target_evidence: "",
    target_suspect: "",
    annotation: "",
  });
  const [noteText, setNoteText] = useState("");

  useEffect(() => {
    async function bootstrap() {
      try {
        const cases = await api.listCases(token);
        if (cases?.length) {
          setCaseId(String(cases[0].id));
        }
      } catch {
        // no-op
      }
    }
    bootstrap();
  }, [token]);

  async function loadBoard() {
    if (!caseId) return;
    setError("");
    try {
      const data = await api.getDetectiveBoardState(token, caseId);
      setBoard(data);
      setNodePos((prev) => {
        const seed = initialNodeMap(data.evidence, data.suspects);
        return { ...seed, ...prev };
      });
    } catch (err) {
      setError(err.message || "Failed to load board");
    }
  }

  async function createRelation() {
    setError("");
    try {
      if (!relationForm.source_evidence) {
        throw new Error("Source evidence is required.");
      }
      if (!relationForm.target_evidence && !relationForm.target_suspect) {
        throw new Error("Pick target evidence or target suspect.");
      }
      const created = await api.createBoardRelation(token, caseId, {
        source_evidence: Number(relationForm.source_evidence),
        target_evidence: relationForm.target_evidence ? Number(relationForm.target_evidence) : null,
        target_suspect: relationForm.target_suspect ? Number(relationForm.target_suspect) : null,
        annotation: relationForm.annotation || "Linked from board",
      });
      setBoard((prev) => ({ ...prev, relations: [...(prev?.relations || []), created] }));
      setRelationForm({ source_evidence: "", target_evidence: "", target_suspect: "", annotation: "" });
    } catch (err) {
      setError(err.message || "Failed to create relation");
    }
  }

  async function createNote() {
    if (!noteText.trim()) return;
    setError("");
    try {
      const created = await api.createBoardNote(token, caseId, { text: noteText.trim() });
      setBoard((prev) => ({ ...prev, notes: [...(prev?.notes || []), created] }));
      setNoteText("");
    } catch (err) {
      setError(err.message || "Failed to create note");
    }
  }

  async function moveNote(noteId, direction) {
    const notes = [...(board?.notes || [])].sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
    const index = notes.findIndex((item) => item.id === noteId);
    const target = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || target < 0 || target >= notes.length) return;
    const swapped = [...notes];
    [swapped[index], swapped[target]] = [swapped[target], swapped[index]];
    const ids = swapped.map((item) => item.id);

    const result = await api.reorderBoardNotes(token, caseId, ids);
    setBoard((prev) => ({ ...prev, notes: result.notes }));
  }

  const lineElements = useMemo(() => {
    if (!board) return [];
    return board.relations
      .map((rel) => {
        const source = nodePos[`e-${rel.source_evidence}`];
        const target = rel.target_evidence
          ? nodePos[`e-${rel.target_evidence}`]
          : nodePos[`s-${rel.target_suspect}`];
        if (!source || !target) return null;
        const x1 = source.x + 80;
        const y1 = source.y + 30;
        const x2 = target.x + 80;
        const y2 = target.y + 30;
        return (
          <line
            key={`l-${rel.id}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#D64545"
            strokeWidth="2"
            strokeDasharray="6,4"
          />
        );
      })
      .filter(Boolean);
  }, [board, nodePos]);

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl uppercase text-brass">Detective Board</h1>
          <p className="text-zinc-400">Interactive board with evidence/suspect nodes and red lines.</p>
        </div>

        <div className="flex items-center gap-2">
          <input className="input" placeholder="Case ID" value={caseId} onChange={(e) => setCaseId(e.target.value)} />
          <button className="btn-primary" onClick={loadBoard}>Load Board</button>
        </div>
      </div>

      {error && <p className="mb-3 text-danger">{error}</p>}

      {board && (
        <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
          <div className="card overflow-hidden p-0">
            <div className="border-b border-zinc-800 px-4 py-3 text-sm text-zinc-300">Board Canvas (drag by step buttons)</div>
            <div className="relative h-[520px] bg-[linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:24px_24px]">
              <svg className="absolute inset-0 h-full w-full">{lineElements}</svg>

              {board.evidence.map((item) => {
                const key = `e-${item.id}`;
                const pos = nodePos[key] || { x: 20, y: 20 };
                return (
                  <div
                    key={key}
                    className="absolute w-40 rounded border border-brass/70 bg-zinc-950/95 p-2 text-xs"
                    style={{ left: pos.x, top: pos.y }}
                  >
                    <p className="font-semibold text-brass">Evidence #{item.id}</p>
                    <p className="truncate text-zinc-300">{item.type}</p>
                    <div className="mt-2 grid grid-cols-2 gap-1">
                      <button className="btn-secondary px-2 py-1" onClick={() => setNodePos((prev) => ({ ...prev, [key]: { ...pos, x: pos.x - 16 } }))}>L</button>
                      <button className="btn-secondary px-2 py-1" onClick={() => setNodePos((prev) => ({ ...prev, [key]: { ...pos, x: pos.x + 16 } }))}>R</button>
                      <button className="btn-secondary px-2 py-1" onClick={() => setNodePos((prev) => ({ ...prev, [key]: { ...pos, y: pos.y - 16 } }))}>U</button>
                      <button className="btn-secondary px-2 py-1" onClick={() => setNodePos((prev) => ({ ...prev, [key]: { ...pos, y: pos.y + 16 } }))}>D</button>
                    </div>
                  </div>
                );
              })}

              {board.suspects.map((item) => {
                const key = `s-${item.id}`;
                const pos = nodePos[key] || { x: 500, y: 100 };
                return (
                  <div
                    key={key}
                    className="absolute w-40 rounded border border-violet-700 bg-zinc-950/95 p-2 text-xs"
                    style={{ left: pos.x, top: pos.y }}
                  >
                    <p className="font-semibold text-violet-300">Suspect #{item.id}</p>
                    <p className="truncate text-zinc-300">{item.name}</p>
                    <p className="text-zinc-500">Score: {item.score}</p>
                    <div className="mt-2 grid grid-cols-2 gap-1">
                      <button className="btn-secondary px-2 py-1" onClick={() => setNodePos((prev) => ({ ...prev, [key]: { ...pos, x: pos.x - 16 } }))}>L</button>
                      <button className="btn-secondary px-2 py-1" onClick={() => setNodePos((prev) => ({ ...prev, [key]: { ...pos, x: pos.x + 16 } }))}>R</button>
                      <button className="btn-secondary px-2 py-1" onClick={() => setNodePos((prev) => ({ ...prev, [key]: { ...pos, y: pos.y - 16 } }))}>U</button>
                      <button className="btn-secondary px-2 py-1" onClick={() => setNodePos((prev) => ({ ...prev, [key]: { ...pos, y: pos.y + 16 } }))}>D</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            <div className="card p-4">
              <p className="mb-3 font-semibold">Create Relation (Red Line)</p>
              <div className="space-y-2">
                <select className="input" value={relationForm.source_evidence} onChange={(e) => setRelationForm((prev) => ({ ...prev, source_evidence: e.target.value }))}>
                  <option value="">Source evidence</option>
                  {board.evidence.map((item) => (
                    <option key={item.id} value={item.id}>Evidence #{item.id}</option>
                  ))}
                </select>
                <select className="input" value={relationForm.target_evidence} onChange={(e) => setRelationForm((prev) => ({ ...prev, target_evidence: e.target.value, target_suspect: "" }))}>
                  <option value="">Target evidence</option>
                  {board.evidence.map((item) => (
                    <option key={item.id} value={item.id}>Evidence #{item.id}</option>
                  ))}
                </select>
                <select className="input" value={relationForm.target_suspect} onChange={(e) => setRelationForm((prev) => ({ ...prev, target_suspect: e.target.value, target_evidence: "" }))}>
                  <option value="">Target suspect</option>
                  {board.suspects.map((item) => (
                    <option key={item.id} value={item.id}>Suspect #{item.id}</option>
                  ))}
                </select>
                <textarea className="input min-h-20" placeholder="Annotation" value={relationForm.annotation} onChange={(e) => setRelationForm((prev) => ({ ...prev, annotation: e.target.value }))} />
                <button className="btn-primary" onClick={createRelation}>Add Relation</button>
              </div>
              {board.mocked_relations && (
                <p className="mt-2 text-xs text-brass">Relations currently persisted in local mock storage.</p>
              )}
            </div>

            <div className="card p-4">
              <p className="mb-3 font-semibold">Notes</p>
              <div className="mb-3 flex gap-2">
                <input className="input" placeholder="New note" value={noteText} onChange={(e) => setNoteText(e.target.value)} />
                <button className="btn-primary" onClick={createNote}>Add</button>
              </div>
              <div className="space-y-2">
                {[...(board.notes || [])]
                  .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
                  .map((note) => (
                    <div key={note.id} className="rounded border border-zinc-700 p-2 text-sm">
                      <p>{note.text}</p>
                      <div className="mt-2 flex gap-2">
                        <button className="btn-secondary" onClick={() => moveNote(note.id, "up")}>Up</button>
                        <button className="btn-secondary" onClick={() => moveNote(note.id, "down")}>Down</button>
                      </div>
                    </div>
                  ))}
                {!board.notes?.length && <p className="text-sm text-zinc-400">No notes.</p>}
              </div>
              {board.mocked_notes && (
                <p className="mt-2 text-xs text-brass">Notes use local fallback when note API list is unavailable.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
