import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export function ReportsPage() {
  const { token } = useAuth();
  const [params, setParams] = useSearchParams();
  const [caseId, setCaseId] = useState(params.get("caseId") || "");
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");

  async function loadReport(targetCaseId = caseId) {
    if (!targetCaseId) return;
    setError("");
    try {
      const [caseData, evidence, suspects, logs] = await Promise.all([
        api.getCase(token, targetCaseId),
        api.listEvidence(token, targetCaseId),
        api.listSuspects(token, targetCaseId),
        api.listInvestigationActions(token, targetCaseId),
      ]);
      setReport({ caseData, evidence, suspects, logs });
      setParams({ caseId: String(targetCaseId) });
    } catch (err) {
      setError(err.message || "Failed to load report data");
      setReport(null);
    }
  }

  useEffect(() => {
    if (params.get("caseId")) {
      loadReport(params.get("caseId"));
    }
  }, []);

  function printSummary() {
    window.print();
  }

  return (
    <section>
      <h1 className="font-display text-3xl uppercase text-brass">Reports</h1>
      <p className="mb-4 mt-1 text-zinc-400">Case summary report export</p>

      <div className="card mb-4 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <input className="input max-w-60" placeholder="Case ID" value={caseId} onChange={(e) => setCaseId(e.target.value)} />
          <button className="btn-secondary" onClick={() => loadReport(caseId)}>Load Case</button>
          <button className="btn-primary" onClick={printSummary} disabled={!report}>Print / Export PDF</button>
        </div>
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      </div>

      {report && (
        <article className="card p-5 print:bg-white print:text-black">
          <header className="mb-4 border-b border-zinc-700 pb-3 print:border-black">
            <h2 className="font-display text-2xl uppercase">Case #{report.caseData.id} Summary</h2>
            <p className="text-sm text-zinc-400 print:text-black">{report.caseData.title}</p>
            <p className="text-sm text-zinc-400 print:text-black">Status: {report.caseData.status} | Level: {report.caseData.level}</p>
          </header>

          <section className="mb-4">
            <h3 className="mb-2 text-sm uppercase tracking-wide text-brass print:text-black">Description</h3>
            <p className="text-sm">{report.caseData.description || "-"}</p>
          </section>

          <section className="mb-4">
            <h3 className="mb-2 text-sm uppercase tracking-wide text-brass print:text-black">Evidence ({report.evidence.length})</h3>
            <div className="space-y-2">
              {report.evidence.map((item) => (
                <div key={item.id} className="rounded border border-zinc-700 p-2 text-sm print:border-black">
                  <p>#{item.id} {item.type} ({item.status})</p>
                  <pre className="mt-1 overflow-auto rounded bg-zinc-950 p-2 text-xs print:bg-white">{JSON.stringify(item.metadata, null, 2)}</pre>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-4">
            <h3 className="mb-2 text-sm uppercase tracking-wide text-brass print:text-black">Suspects ({report.suspects.length})</h3>
            <div className="space-y-2">
              {report.suspects.map((item) => (
                <div key={item.id} className="rounded border border-zinc-700 p-2 text-sm print:border-black">
                  {item.name} | status: {item.status} | score: {item.score}
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-sm uppercase tracking-wide text-brass print:text-black">Investigation Log ({report.logs.length})</h3>
            <div className="space-y-2">
              {report.logs.map((item) => (
                <div key={item.id} className="rounded border border-zinc-700 p-2 text-sm print:border-black">
                  <p>{item.action_type}</p>
                  <p className="text-xs text-zinc-400 print:text-black">{new Date(item.created_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </section>
        </article>
      )}
    </section>
  );
}
