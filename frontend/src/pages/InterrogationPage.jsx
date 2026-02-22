import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { isDetectiveRole } from "../lib/roleRouting";

export function InterrogationPage() {
  const { token, roleName } = useAuth();
  const [caseId, setCaseId] = useState("");
  const [suspectId, setSuspectId] = useState("");
  const [detectiveScore, setDetectiveScore] = useState(5);
  const [sergeantScore, setSergeantScore] = useState(5);
  const [captainVerdict, setCaptainVerdict] = useState("ARREST_WARRANT");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const role = String(roleName || "").toLowerCase();
  const detectiveView = isDetectiveRole(roleName);
  const isCaptain = role.includes("captain");
  const isDetectiveOrSergeant = role.includes("detective") || role.includes("sergeant");
  const averageScore = useMemo(
    () => ((Number(detectiveScore) + Number(sergeantScore)) / 2).toFixed(1),
    [detectiveScore, sergeantScore],
  );

  async function submitScores() {
    setError("");
    setMessage("");
    try {
      if (!caseId || !suspectId) {
        throw new Error("Case ID and Suspect ID are required.");
      }

      await api.createInvestigationAction(token, {
        case: Number(caseId),
        action_type: "interrogation_scored",
        payload: {
          suspect_id: Number(suspectId),
          detective_score: Number(detectiveScore),
          sergeant_score: Number(sergeantScore),
          average_score: Number(averageScore),
        },
      });

      setMessage(`Scores submitted. Average: ${averageScore}. Captain should receive notification.`);
    } catch (err) {
      setError(err.message || "Failed to submit scores");
    }
  }

  async function submitCaptainVerdict() {
    setError("");
    setMessage("");
    try {
      if (!caseId || !suspectId) {
        throw new Error("Case ID and Suspect ID are required.");
      }

      // TODO: Replace with backend captain verdict endpoint when implemented.
      // Probable API URL: POST /api/investigations/captain-verdict/
      // await request('/investigations/captain-verdict/', { method: 'POST', body: JSON.stringify(...) }, token);
      await api.createInvestigationAction(token, {
        case: Number(caseId),
        action_type: "captain_verdict_mock",
        payload: {
          suspect_id: Number(suspectId),
          verdict: captainVerdict,
          average_score: Number(averageScore),
          mocked: true,
        },
      });

      setMessage(`Captain verdict recorded (mock): ${captainVerdict}`);
    } catch (err) {
      setError(err.message || "Failed to submit verdict");
    }
  }

  return (
    <section>
      <h1 className="font-display text-3xl uppercase text-brass">Interrogation</h1>
      <p className="mb-6 mt-1 text-zinc-400">Detective + Sergeant score input, Captain verdict.</p>

      {detectiveView && (
        <div className="mb-4 flex flex-wrap gap-2">
          <Link className="btn-secondary" to="/suspect-referrals">
            Suspect Referral
          </Link>
          <Link className="btn-secondary" to="/evidence-review">
            Evidence Review
          </Link>
        </div>
      )}

      <div className="card max-w-2xl p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <input className="input" placeholder="Case ID" value={caseId} onChange={(e) => setCaseId(e.target.value)} />
          <input className="input" placeholder="Suspect ID" value={suspectId} onChange={(e) => setSuspectId(e.target.value)} />
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm">Detective score: {detectiveScore}</label>
            <input
              className="mt-1 w-full"
              type="range"
              min={1}
              max={10}
              value={detectiveScore}
              onChange={(e) => setDetectiveScore(Number(e.target.value))}
              disabled={!isDetectiveOrSergeant && !isCaptain}
            />
          </div>

          <div>
            <label className="text-sm">Sergeant score: {sergeantScore}</label>
            <input
              className="mt-1 w-full"
              type="range"
              min={1}
              max={10}
              value={sergeantScore}
              onChange={(e) => setSergeantScore(Number(e.target.value))}
              disabled={!isDetectiveOrSergeant && !isCaptain}
            />
          </div>
        </div>

        <p className="mt-3 text-sm text-zinc-300">Average score: <span className="text-brass">{averageScore}</span></p>

        {isDetectiveOrSergeant && (
          <button className="btn-primary mt-4" onClick={submitScores}>Submit Scores</button>
        )}

        {isCaptain && (
          <div className="mt-5 rounded border border-zinc-700 p-3">
            <p className="mb-2 text-sm">Captain verdict</p>
            <select className="input" value={captainVerdict} onChange={(e) => setCaptainVerdict(e.target.value)}>
              <option value="ARREST_WARRANT">ARREST_WARRANT</option>
              <option value="DISMISS">DISMISS</option>
            </select>
            <button className="btn-primary mt-3" onClick={submitCaptainVerdict}>Issue Verdict</button>
          </div>
        )}

        {!isDetectiveOrSergeant && !isCaptain && (
          <p className="mt-4 text-brass">Read-only mode for this role.</p>
        )}

        {message && <p className="mt-3 text-emerald-400">{message}</p>}
        {error && <p className="mt-3 text-danger">{error}</p>}
      </div>
    </section>
  );
}
