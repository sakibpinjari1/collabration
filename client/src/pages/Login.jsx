import { useState } from "react";
import { useAuth } from "../context/AuthContext";

function Login() {
  const { login, register } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [isRegister, setIsRegister] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isRegister) {
        if (!name) {
          setError("Name is required for registration");
          return;
        }
        await register(name, email, password);
        setError("");
        setIsRegister(false);
        setName("");
        setEmail("");
        setPassword("");
      } else {
        await login(email, password);
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          (isRegister ? "Registration failed" : "Login failed")
      );
      console.error("Auth error:", err);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500";
  const primaryButton =
    "w-full inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700";
  const linkButton =
    "text-sm font-semibold text-blue-600 hover:text-blue-700 underline-offset-4 hover:underline";

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              {isRegister ? "Create Account" : "Login"}
            </h2>
            <p className="text-sm text-slate-500">
              {isRegister
                ? "Start collaborating with your team."
                : "Welcome back. Enter your credentials."}
            </p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          {isRegister && (
            <input
              className={inputClass}
              type="text"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          )}

          <input
            className={inputClass}
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            className={inputClass}
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button className={primaryButton} type="submit">
            {isRegister ? "Register" : "Login"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-600">
          {isRegister ? "Already have an account? " : "Don't have an account? "}
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setError("");
            }}
            className={linkButton}
            type="button"
          >
            {isRegister ? "Login here" : "Register here"}
          </button>
        </p>
      </div>
    </div>
  );
}

export default Login;

