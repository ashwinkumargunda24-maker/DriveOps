import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import api, { errMsg } from "./api"

function Register() {
   const navigate = useNavigate()
   const [error, setError] = useState("")
   const [success, setSuccess] = useState("")
   const [loading, setLoading] = useState(false)
   const [data,setData]=useState(
   {
      username:"",
      email:"",
      phone:"",
      password:""
   }) 
  const change=(e)=>
  {
     setData({...data,[e.target.name]:e.target.value})
  }
   const regSubmit= async(event)=>
   {
       event.preventDefault()
       setError(""); setSuccess(""); setLoading(true)
       try {
          await api.post("/auth/register", data)
          setSuccess("Account created. Redirecting to login...")
          setTimeout(() => navigate("/log"), 700)
       } catch (err) {
          setError(errMsg(err, "Unable to create your account."))
       } finally { setLoading(false) }
  }
  return(
    <main className="auth-page">
         <section className="auth-art register-art"><Link to="/" className="auth-brand"><span className="brand-mark">D</span><strong>drive<span>ops</span></strong></Link><div className="auth-art-copy"><span className="eyebrow">A better way to move</span><h1>Build your<br /><em>fleet future.</em></h1></div></section>
         <section className="auth-panel"><div className="auth-form-wrap"><span className="eyebrow accent-eyebrow">Get started</span><h2>Create your account</h2><p className="auth-subtitle">Join your operations workspace in a minute.</p><form onSubmit={regSubmit}><label>Username<input required minLength="3" value={data.username} onChange={change} name="username" placeholder="Choose a username" autoComplete="username" /></label><label>Email address<input required type="email" value={data.email} onChange={change} name="email" placeholder="you@company.com" autoComplete="email" /></label><label>Phone number<input required type="tel" value={data.phone} onChange={change} name="phone" placeholder="Enter your phone number" autoComplete="tel" /></label><label>Password<input required minLength="6" type="password" value={data.password} onChange={change} name="password" placeholder="Choose any 6+ characters" autoComplete="new-password" /><small>No capital letters or symbols required.</small></label>{error && <div className="form-error">{error}</div>}{success && <div className="form-success">{success}</div>}<button className="auth-submit" disabled={loading}>{loading ? "Creating account..." : "Sign up"}<span>→</span></button></form><p className="auth-switch">Already have an account? <Link to="/log">Log in</Link></p></div><span className="auth-copyright">© 2026 DriveOps</span></section>
    </main>
  )
}
export default Register