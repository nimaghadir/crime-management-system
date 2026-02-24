import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getHomePathForRole } from "../lib/roleRouting";
import { formatUiApiError } from "../lib/uiApiError";

export function LoginPage() {
  const navigate = useNavigate();
  const { login, loading } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(event) {
    event.preventDefault();
    setError("");
    try {
      const response = await login(identifier, password);
      navigate(getHomePathForRole(response?.user?.role_name), { replace: true });
    } catch (err) {
      setError(formatUiApiError(err, "Login failed"));
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-noir px-4">
      <form className="card w-full max-w-md p-6" onSubmit={onSubmit}>
        <div className="mb-4">
          <Link to="/" className="btn-secondary inline-flex">
            Back to Home
          </Link>
        </div>

        <h1 className="font-display text-3xl uppercase text-brass">Login</h1>
        <p className="mb-6 mt-1 text-sm text-zinc-400">Use username, email, phone, or national ID.</p>

        <div className="space-y-3">
          <input
            className="input"
            placeholder="Identifier"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
          />
          <input
            className="input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        {error && <p className="mt-3 text-sm text-danger">{error}</p>}

        <button className="btn-primary mt-5 w-full" disabled={loading}>
          {loading ? "Signing in..." : "Sign In"}
        </button>

        <p className="mt-4 text-sm text-zinc-300">
          No account? <Link to="/register" className="text-brass">Register</Link>
        </p>
      </form>
    </div>
  );
}
