import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

const BOARD_WIDTH = 1100;
const BOARD_HEIGHT = 560;
const DEFAULT_CARD_SIZE = { width: 180, height: 88 };
const NOTE_CARD_SIZE = { width: 220, height: 112 };

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function shortText(value, max = 64) {
  const text = String(value || "").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}...`;
}

function nodeSize(nodeKey) {
  return String(nodeKey).startsWith("n-") ? NOTE_CARD_SIZE : DEFAULT_CARD_SIZE;
}

function parseNodeKey(nodeKey) {
  const [prefix, rawId] = String(nodeKey || "").split("-");
  const id = Number(rawId);
  if (!id) return null;
  if (prefix === "e") return { kind: "evidence", id };
  if (prefix === "n") return { kind: "note", id };
  return null;
}

function relationNodeKey(relation, side) {
  const evidenceId = Number(relation?.[`${side}_evidence`]);
  if (evidenceId) return `e-${evidenceId}`;

  const noteId = Number(relation?.[`${side}_note`]);
  if (noteId) return `n-${noteId}`;

  return "";
}

function seedNodePositions(evidence = [], notes = []) {
  const map = {};

  evidence.forEach((item, idx) => {
    map[`e-${item.id}`] = {
      x: 44 + (idx % 4) * 210,
      y: 52 + Math.floor(idx / 4) * 112,
    };
  });

  notes.forEach((item, idx) => {
    map[`n-${item.id}`] = {
      x: 480 + (idx % 2) * 260,
      y: 92 + Math.floor(idx / 2) * 130,
    };
  });

  return map;
}

function buildRelationPayload(sourceKey, targetKey, annotation) {
  const source = parseNodeKey(sourceKey);
  const target = parseNodeKey(targetKey);
  if (!source || !target) {
    throw new Error("Source and target are required.");
  }
  if (sourceKey === targetKey) {
    throw new Error("Source and target must be different nodes.");
  }

  const payload = {
    annotation: String(annotation || "").trim() || "Linked from board",
  };

  payload[`source_${source.kind}`] = source.id;
  payload[`target_${target.kind}`] = target.id;
  return payload;
}

function roundedRect(ctx, x, y, width, height, radius, fillStyle, strokeStyle) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
  ctx.fillStyle = fillStyle;
  ctx.fill();
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = 1.2;
  ctx.stroke();
}

function drawCard(ctx, { x, y, width, height, border, title, lines }) {
  roundedRect(ctx, x, y, width, height, 10, "rgba(6, 10, 30, 0.95)", border);
  ctx.fillStyle = border;
  ctx.font = "600 12px IBM Plex Sans, sans-serif";
  ctx.fillText(shortText(title, 26), x + 10, y + 20);

  ctx.fillStyle = "#D4D4DC";
  ctx.font = "11px IBM Plex Sans, sans-serif";
  lines.forEach((line, idx) => {
    ctx.fillText(shortText(line, 34), x + 10, y + 40 + idx * 16);
  });
}

function exportBoardSnapshot({ board, nodePos, caseId }) {
  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = BOARD_WIDTH * scale;
  canvas.height = BOARD_HEIGHT * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas is not available in this browser.");
  }

  ctx.scale(scale, scale);

  const gradient = ctx.createLinearGradient(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
  gradient.addColorStop(0, "#0E1537");
  gradient.addColorStop(0.5, "#131A3A");
  gradient.addColorStop(1, "#0A0F23");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);

  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= BOARD_WIDTH; x += 24) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, BOARD_HEIGHT);
    ctx.stroke();
  }
  for (let y = 0; y <= BOARD_HEIGHT; y += 24) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(BOARD_WIDTH, y);
    ctx.stroke();
  }

  (board?.relations || []).forEach((relation) => {
    const sourceKey = relationNodeKey(relation, "source");
    const targetKey = relationNodeKey(relation, "target");
    if (!sourceKey || !targetKey) return;
    const sourcePos = nodePos[sourceKey];
    const targetPos = nodePos[targetKey];
    if (!sourcePos || !targetPos) return;

    const sourceSize = nodeSize(sourceKey);
    const targetSize = nodeSize(targetKey);
    const x1 = sourcePos.x + sourceSize.width / 2;
    const y1 = sourcePos.y + sourceSize.height / 2;
    const x2 = targetPos.x + targetSize.width / 2;
    const y2 = targetPos.y + targetSize.height / 2;

    ctx.save();
    ctx.strokeStyle = "#D64545";
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
  });

  (board?.evidence || []).forEach((item) => {
    const key = `e-${item.id}`;
    const pos = nodePos[key];
    if (!pos) return;
    drawCard(ctx, {
      x: pos.x,
      y: pos.y,
      width: DEFAULT_CARD_SIZE.width,
      height: DEFAULT_CARD_SIZE.height,
      border: "#7C3AED",
      title: `Evidence #${item.id}`,
      lines: [item.type || "-", item.status || "pending"],
    });
  });

  (board?.notes || []).forEach((item) => {
    const key = `n-${item.id}`;
    const pos = nodePos[key];
    if (!pos) return;
    drawCard(ctx, {
      x: pos.x,
      y: pos.y,
      width: NOTE_CARD_SIZE.width,
      height: NOTE_CARD_SIZE.height,
      border: "#D64545",
      title: `Note #${item.id}`,
      lines: [item.text || ""],
    });
  });

  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = `detective-board-case-${caseId || "unknown"}.png`;
  link.click();
}

export function DetectiveBoardPage() {
  const { token } = useAuth();
  const boardRef = useRef(null);
  const [caseId, setCaseId] = useState("");
  const [board, setBoard] = useState(null);
  const [error, setError] = useState("");
  const [nodePos, setNodePos] = useState({});
  const [dragging, setDragging] = useState(null);
  const [hoveredRelationId, setHoveredRelationId] = useState(null);
  const [activeRelationId, setActiveRelationId] = useState(null);
  const [relationForm, setRelationForm] = useState({
    source_key: "",
    target_key: "",
    annotation: "",
  });
  const [noteText, setNoteText] = useState("");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    async function bootstrap() {
      try {
        const cases = await api.listCases(token);
        if (cases?.length) {
          const firstCaseId = String(cases[0].id);
          setCaseId(firstCaseId);
          await loadBoard(firstCaseId);
        }
      } catch {
        // no-op
      }
    }
    bootstrap();
  }, [token]);

  useEffect(() => {
    if (!dragging) return undefined;

    function onPointerMove(event) {
      const rect = boardRef.current?.getBoundingClientRect();
      if (!rect) return;

      const size = nodeSize(dragging.key);
      const x = clamp(
        event.clientX - rect.left - dragging.offsetX,
        0,
        Math.max(0, rect.width - size.width),
      );
      const y = clamp(
        event.clientY - rect.top - dragging.offsetY,
        0,
        Math.max(0, rect.height - size.height),
      );
      setNodePos((prev) => ({
        ...prev,
        [dragging.key]: { x, y },
      }));
    }

    function onPointerUp() {
      setDragging(null);
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [dragging]);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape") {
        setActiveRelationId(null);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  async function loadBoard(explicitCaseId = caseId) {
    const targetCaseId = String(explicitCaseId || "").trim();
    if (!targetCaseId) return;

    setError("");
    try {
      const data = await api.getDetectiveBoardState(token, targetCaseId);
      const rawRelations = Array.isArray(data?.relations) ? data.relations : [];
      const safeBoard = {
        ...data,
        evidence: Array.isArray(data?.evidence) ? data.evidence : [],
        suspects: [],
        notes: Array.isArray(data?.notes) ? data.notes : [],
        relations: rawRelations.filter(
          (item) => relationNodeKey(item, "source") && relationNodeKey(item, "target"),
        ),
      };
      setBoard(safeBoard);
      setNodePos((prev) => ({
        ...seedNodePositions(safeBoard.evidence, safeBoard.notes),
        ...prev,
      }));
    } catch (err) {
      setError(err.message || "Failed to load board");
    }
  }

  function startDrag(event, nodeKey) {
    if (event.button !== undefined && event.button !== 0) return;
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return;

    const current = nodePos[nodeKey] || { x: 16, y: 16 };
    setDragging({
      key: nodeKey,
      offsetX: event.clientX - rect.left - current.x,
      offsetY: event.clientY - rect.top - current.y,
    });
    event.preventDefault();
  }

  async function createRelation() {
    if (!board) return;
    setError("");
    try {
      const payload = buildRelationPayload(
        relationForm.source_key,
        relationForm.target_key,
        relationForm.annotation,
      );
      const created = await api.createBoardRelation(token, caseId, payload);
      const relation = {
        ...payload,
        ...(created || {}),
        id: created?.id ?? Date.now(),
      };
      setBoard((prev) => ({
        ...prev,
        relations: [...(prev?.relations || []), relation],
      }));
      setRelationForm({ source_key: "", target_key: "", annotation: "" });
    } catch (err) {
      setError(err.message || "Failed to create relation");
    }
  }

  async function deleteRelation(relationId) {
    setError("");
    try {
      await api.deleteBoardRelation(token, caseId, relationId);
      setBoard((prev) => ({
        ...prev,
        relations: (prev?.relations || []).filter((item) => String(item.id) !== String(relationId)),
      }));
      setHoveredRelationId((prev) =>
        String(prev) === String(relationId) ? null : prev,
      );
      setActiveRelationId((prev) =>
        String(prev) === String(relationId) ? null : prev,
      );
    } catch (err) {
      setError(err.message || "Failed to delete relation");
    }
  }

  async function createNote() {
    if (!board || !noteText.trim()) return;
    setError("");
    try {
      const text = noteText.trim();
      const created = await api.createBoardNote(token, caseId, { text });
      const noteId = Number(created?.id) || Date.now();
      const nextNote = {
        ...created,
        id: noteId,
        text: created?.text || text,
      };

      setBoard((prev) => ({
        ...prev,
        notes: [...(prev?.notes || []), nextNote],
      }));

      setNodePos((prev) => {
        const key = `n-${noteId}`;
        if (prev[key]) return prev;
        const noteCount = Object.keys(prev).filter((item) => item.startsWith("n-")).length;
        const size = nodeSize(key);
        return {
          ...prev,
          [key]: {
            x: clamp(140 + (noteCount % 3) * 250, 0, BOARD_WIDTH - size.width),
            y: clamp(420 - (noteCount % 2) * 140, 0, BOARD_HEIGHT - size.height),
          },
        };
      });

      setNoteText("");
    } catch (err) {
      setError(err.message || "Failed to create note");
    }
  }

  async function deleteNote(noteId) {
    setError("");
    try {
      await api.deleteNote(token, noteId);
      setBoard((prev) => ({
        ...prev,
        notes: (prev?.notes || []).filter((item) => Number(item.id) !== Number(noteId)),
        relations: (prev?.relations || []).filter(
          (item) =>
            Number(item.source_note) !== Number(noteId) &&
            Number(item.target_note) !== Number(noteId),
        ),
      }));
      setNodePos((prev) => {
        const next = { ...prev };
        delete next[`n-${noteId}`];
        return next;
      });
    } catch (err) {
      setError(err.message || "Failed to delete note");
    }
  }

  async function downloadBoard() {
    if (!board) return;
    setExporting(true);
    setError("");
    try {
      exportBoardSnapshot({ board, nodePos, caseId });
    } catch (err) {
      setError(err.message || "Failed to export board image.");
    } finally {
      setExporting(false);
    }
  }

  const nodeOptions = useMemo(() => {
    if (!board) return [];
    return [
      ...(board.evidence || []).map((item) => ({
        key: `e-${item.id}`,
        label: `Evidence #${item.id}`,
      })),
      ...(board.notes || []).map((item) => ({
        key: `n-${item.id}`,
        label: `Note #${item.id}`,
      })),
    ];
  }, [board]);

  const nodeLabels = useMemo(
    () => Object.fromEntries(nodeOptions.map((item) => [item.key, item.label])),
    [nodeOptions],
  );

  const relationRecords = useMemo(() => {
    if (!board) return [];
    return (board.relations || [])
      .map((relation) => {
        const sourceKey = relationNodeKey(relation, "source");
        const targetKey = relationNodeKey(relation, "target");
        if (!sourceKey || !targetKey) return null;

        return {
          relation,
          sourceKey,
          targetKey,
          sourceLabel: nodeLabels[sourceKey] || sourceKey,
          targetLabel: nodeLabels[targetKey] || targetKey,
        };
      })
      .filter(Boolean);
  }, [board, nodeLabels]);

  const hoveredRelation = useMemo(
    () =>
      relationRecords.find(
        (item) => String(item.relation.id) === String(hoveredRelationId),
      ) || null,
    [relationRecords, hoveredRelationId],
  );

  const activeRelation = useMemo(
    () =>
      relationRecords.find(
        (item) => String(item.relation.id) === String(activeRelationId),
      ) || null,
    [relationRecords, activeRelationId],
  );

  useEffect(() => {
    if (!activeRelationId) return;
    const exists = relationRecords.some(
      (item) => String(item.relation.id) === String(activeRelationId),
    );
    if (!exists) {
      setActiveRelationId(null);
    }
  }, [activeRelationId, relationRecords]);

  const lineElements = useMemo(() => {
    if (!board) return [];

    return relationRecords
      .map((record) => {
        const relation = record.relation;
        const sourceKey = record.sourceKey;
        const targetKey = record.targetKey;
        const source = nodePos[sourceKey];
        const target = nodePos[targetKey];
        if (!source || !target) return null;

        const sourceSize = nodeSize(sourceKey);
        const targetSize = nodeSize(targetKey);
        const x1 = source.x + sourceSize.width / 2;
        const y1 = source.y + sourceSize.height / 2;
        const x2 = target.x + targetSize.width / 2;
        const y2 = target.y + targetSize.height / 2;
        const isActive = String(activeRelationId) === String(relation.id);
        const isHovered = String(hoveredRelationId) === String(relation.id);

        return (
          <g key={`line-${relation.id}-${sourceKey}-${targetKey}`}>
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={isActive || isHovered ? "#FF6B6B" : "#D64545"}
              strokeWidth={isActive || isHovered ? "3.4" : "2.2"}
              strokeDasharray="8,5"
              className="cursor-pointer transition-all"
              pointerEvents="stroke"
              onMouseEnter={() => setHoveredRelationId(relation.id)}
              onMouseLeave={() => setHoveredRelationId(null)}
              onClick={() => setActiveRelationId(relation.id)}
            >
              <title>{`${record.sourceLabel} -> ${record.targetLabel}`}</title>
            </line>
          </g>
        );
      })
      .filter(Boolean);
  }, [board, relationRecords, nodePos, activeRelationId, hoveredRelationId]);

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl uppercase text-brass">Detective Board</h1>
          <p className="text-zinc-400">
            Drag and drop evidence/notes, connect them with red lines, and export the board as an image.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            className="input"
            placeholder="Case ID"
            value={caseId}
            onChange={(event) => setCaseId(event.target.value)}
          />
          <button className="btn-primary" onClick={() => loadBoard()}>
            Load Board
          </button>
          <button className="btn-secondary" onClick={downloadBoard} disabled={!board || exporting}>
            {exporting ? "Exporting..." : "Export PNG"}
          </button>
        </div>
      </div>

      {error && <p className="mb-3 text-danger">{error}</p>}

      {board && (
        <div className="grid gap-4 xl:grid-cols-[1.25fr_1fr]">
          <div className="card overflow-hidden p-0">
            <div className="border-b border-zinc-800 px-4 py-3 text-sm text-zinc-300">
              Board Canvas (notes are also inside the board)
            </div>
            <div className="overflow-x-auto">
                <div
                  ref={boardRef}
                  className="relative h-[560px] w-[1100px] bg-[linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:24px_24px]"
                >
                  <svg className="absolute inset-0 h-full w-full">
                    {lineElements}
                  </svg>

                  {hoveredRelation && (
                    <div className="absolute bottom-2 left-2 rounded border border-red-500/50 bg-zinc-950/90 px-3 py-1.5 text-[11px] text-red-100">
                      {hoveredRelation.sourceLabel} {"->"} {hoveredRelation.targetLabel}
                    </div>
                  )}

                  {(board.evidence || []).map((item) => {
                  const key = `e-${item.id}`;
                  const pos = nodePos[key] || { x: 20, y: 20 };
                  return (
                    <div
                      key={key}
                      className="absolute cursor-grab rounded border border-brass/70 bg-zinc-950/95 p-2 text-xs active:cursor-grabbing"
                      style={{ left: pos.x, top: pos.y, width: DEFAULT_CARD_SIZE.width }}
                      onPointerDown={(event) => startDrag(event, key)}
                    >
                      <p className="font-semibold text-brass">Evidence #{item.id}</p>
                      <p className="truncate text-zinc-300">{item.type || "-"}</p>
                      <p className="mt-1 text-[11px] uppercase text-zinc-500">{item.status || "pending"}</p>
                    </div>
                  );
                })}

                {(board.notes || []).map((item) => {
                  const key = `n-${item.id}`;
                  const pos = nodePos[key] || { x: 700, y: 200 };
                  return (
                    <div
                      key={key}
                      className="absolute cursor-grab rounded border border-red-500/80 bg-zinc-950/95 p-2 text-xs active:cursor-grabbing"
                      style={{ left: pos.x, top: pos.y, width: NOTE_CARD_SIZE.width }}
                      onPointerDown={(event) => startDrag(event, key)}
                    >
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <p className="font-semibold text-red-300">Note #{item.id}</p>
                        <button
                          className="rounded border border-red-400/60 px-1.5 py-0.5 text-[10px] text-red-200 hover:bg-red-900/20"
                          onPointerDown={(event) => event.stopPropagation()}
                          onClick={(event) => {
                            event.stopPropagation();
                            deleteNote(item.id);
                          }}
                        >
                          Delete
                        </button>
                      </div>
                      <p className="whitespace-pre-wrap break-words text-zinc-200">{item.text}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="card p-4">
              <p className="mb-3 font-semibold">Create Relation (Red Line)</p>
              <div className="space-y-2">
                <select
                  className="input"
                  value={relationForm.source_key}
                  onChange={(event) =>
                    setRelationForm((prev) => ({ ...prev, source_key: event.target.value }))
                  }
                >
                  <option value="">Source node</option>
                  {nodeOptions.map((item) => (
                    <option key={`src-${item.key}`} value={item.key}>
                      {item.label}
                    </option>
                  ))}
                </select>

                <select
                  className="input"
                  value={relationForm.target_key}
                  onChange={(event) =>
                    setRelationForm((prev) => ({ ...prev, target_key: event.target.value }))
                  }
                >
                  <option value="">Target node</option>
                  {nodeOptions.map((item) => (
                    <option key={`tgt-${item.key}`} value={item.key}>
                      {item.label}
                    </option>
                  ))}
                </select>

                <textarea
                  className="input min-h-20"
                  placeholder="Annotation"
                  value={relationForm.annotation}
                  onChange={(event) =>
                    setRelationForm((prev) => ({ ...prev, annotation: event.target.value }))
                  }
                />
                <button className="btn-primary" onClick={createRelation}>
                  Add Relation
                </button>
              </div>
              {board.mocked_relations && (
                <p className="mt-2 text-xs text-brass">Relations are persisted in local mock storage.</p>
              )}
            </div>

            <div className="card p-4">
              <p className="mb-3 font-semibold">Create Note (inside board)</p>
              <div className="flex gap-2">
                <input
                  className="input"
                  placeholder="New note"
                  value={noteText}
                  onChange={(event) => setNoteText(event.target.value)}
                />
                <button className="btn-primary" onClick={createNote}>
                  Add
                </button>
              </div>
              {board.mocked_notes && (
                <p className="mt-2 text-xs text-brass">Notes use local fallback when note APIs are unavailable.</p>
              )}
            </div>

            <div className="card p-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="font-semibold">Relation Controls</p>
                <span className="text-xs text-zinc-400">{(board.relations || []).length} relation(s)</span>
              </div>
              <p className="text-sm text-zinc-300">
                Relations are managed directly on the board.
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Hover a red line to highlight it. Click the line to open details and delete it in the modal.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeRelation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setActiveRelationId(null)}
        >
          <div
            className="w-full max-w-xl rounded-lg border border-zinc-700 bg-zinc-950 p-4"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-paper">Relation Details</p>
                <p className="text-xs text-zinc-400">
                  ID #{activeRelation.relation.id}
                </p>
              </div>
              <button
                className="btn-secondary"
                onClick={() => setActiveRelationId(null)}
              >
                Close
              </button>
            </div>

            <div className="space-y-2 rounded border border-zinc-800 bg-zinc-900/60 p-3 text-sm">
              <p>
                <span className="text-zinc-400">Source:</span> {activeRelation.sourceLabel}
              </p>
              <p>
                <span className="text-zinc-400">Target:</span> {activeRelation.targetLabel}
              </p>
              <p>
                <span className="text-zinc-400">Annotation:</span>{" "}
                {activeRelation.relation.annotation || "No annotation"}
              </p>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                className="btn-secondary"
                onClick={() => setActiveRelationId(null)}
              >
                Cancel
              </button>
              <button
                className="rounded-md border border-red-400/70 bg-red-950/30 px-4 py-2 text-sm text-red-100 transition hover:bg-red-900/40"
                onClick={() => deleteRelation(activeRelation.relation.id)}
              >
                Delete Relation
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
