import {useState} from "react";
import {useAuth} from "../context/AuthContext";

function Login() {
    const {login, register} = useAuth();
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
                // Registration succeeded; switch to login form.
                setIsRegister(false);
                setName("");
                setEmail("");
                setPassword("");
            } else {
                await login(email, password);
            }
        } catch (err) {
            setError(err.response?.data?.message || (isRegister ? "Registration failed" : "Login failed"));
            console.error("Auth error:", err);
        }
    };

    return (
        <div className="card" style={{ maxWidth: "420px", margin: "50px auto", padding: "20px" }}>
            <form onSubmit={handleSubmit}>
                <h2>{isRegister ? "Create Account" : "Login"}</h2>
                
                {error && <p className="notice">{error}</p>}

                {isRegister && (
                    <input
                        className="input"
                        type="text"
                        placeholder="Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        style={{ width: "100%", marginBottom: "10px" }}
                    />
                )}

                <input
                    className="input"
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ width: "100%", marginBottom: "10px" }}
                />

                <input
                    className="input"
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ width: "100%", marginBottom: "10px" }}
                />

                <button className="button" type="submit" style={{ width: "100%", marginBottom: "10px" }}>
                    {isRegister ? "Register" : "Login"}
                </button>
            </form>

            <p style={{ textAlign: "center" }}>
                {isRegister ? "Already have an account? " : "Don't have an account? "}
                <button 
                    onClick={() => {
                        setIsRegister(!isRegister);
                        setError("");
                    }}
                    className="button secondary"
                    style={{ background: "none", border: "none", textDecoration: "underline" }}
                >
                    {isRegister ? "Login here" : "Register here"}
                </button>
            </p>
        </div>
    );
}

export default Login;
