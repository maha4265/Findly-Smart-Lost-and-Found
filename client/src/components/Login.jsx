import { useState } from "react";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function Login({ onLogin, initialMode = "login" }) {
  const [mode, setMode] = useState(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const authenticate = async () => {
    setError("");
    setLoading(true);

    try {
      if (mode === "register") {
        await axios.post(`${API_BASE}/auth/register`, { name, email, password, phone, address });
      }

      const res = await axios.post(`${API_BASE}/auth/login`, { email, password });
      localStorage.setItem("token", res.data.token);
      onLogin(res.data.token);
    } catch (err) {
      setError(err.response?.data?.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="panel login-panel">
      <h2>{mode === "login" ? "Sign In" : "Create account"}</h2>
      <div className="form-grid">
        {mode === "register" && (
          <>
            <label>
              Name
              <input value={name} onChange={(event) => setName(event.target.value)} type="text" placeholder="Your name" />
            </label>
            <label>
              Phone number
              <input value={phone} onChange={(event) => setPhone(event.target.value)} type="tel" placeholder="Phone number" />
            </label>
            <label>
              Address
              <textarea value={address} onChange={(event) => setAddress(event.target.value)} rows="3" placeholder="Hostel, department, or address" />
            </label>
          </>
        )}
        <label>
          Email
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="student@example.com" />
        </label>
        <label>
          Password
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="Password" />
        </label>
      </div>
      {error && <p className="error-message">{error}</p>}
      <button className="primary" type="button" onClick={authenticate} disabled={loading}>
        {loading ? "Working..." : mode === "login" ? "Login" : "Register"}
      </button>
      <p className="muted">
        {mode === "login" ? "Need an account?" : "Already have an account?"}
        <button type="button" className="link-button" onClick={() => setMode(mode === "login" ? "register" : "login")}>{mode === "login" ? "Register" : "Sign in"}</button>
      </p>
    </main>
  );
}
