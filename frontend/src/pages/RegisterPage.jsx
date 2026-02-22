import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getHomePathForRole } from "../lib/roleRouting";

const emptyForm = {
  username: "",
  password: "",
  email: "",
  phone: "",
  first_name: "",
  last_name: "",
  national_id: "",
};

export function RegisterPage() {
  const navigate = useNavigate();
  const { register, loading } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(event) {
    event.preventDefault();
    setError("");
    try {
      const response = await register(form);
      navigate(getHomePathForRole(response?.user?.role_name), { replace: true });
    } catch (err) {
      setError(err.message || "Registration failed");
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-noir px-4 py-8">
      <form className="card w-full max-w-xl p-6" onSubmit={onSubmit}>
        <h1 className="font-display text-3xl uppercase text-brass">Register</h1>
        <p className="mb-5 mt-1 text-sm text-zinc-400">Citizen self-registration</p>

        <div className="grid gap-3 md:grid-cols-2">
          <input className="input" placeholder="Username" value={form.username} onChange={(e) => updateField("username", e.target.value)} />
          <input className="input" type="password" placeholder="Password" value={form.password} onChange={(e) => updateField("password", e.target.value)} />
          <input className="input" placeholder="Email" value={form.email} onChange={(e) => updateField("email", e.target.value)} />
          <input className="input" placeholder="Phone" value={form.phone} onChange={(e) => updateField("phone", e.target.value)} />
          <input className="input" placeholder="First Name" value={form.first_name} onChange={(e) => updateField("first_name", e.target.value)} />
          <input className="input" placeholder="Last Name" value={form.last_name} onChange={(e) => updateField("last_name", e.target.value)} />
          <input className="input md:col-span-2" placeholder="National ID" value={form.national_id} onChange={(e) => updateField("national_id", e.target.value)} />
        </div>

        {error && <p className="mt-3 text-sm text-danger">{error}</p>}

        <button className="btn-primary mt-5 w-full" disabled={loading}>
          {loading ? "Creating account..." : "Create Account"}
        </button>

        <p className="mt-4 text-sm text-zinc-300">
          Already have an account? <Link to="/login" className="text-brass">Login</Link>
        </p>
      </form>
    </div>
  );
}
