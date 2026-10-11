import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import api, { errMsg } from "./api"

function Login() {
   const navigate=useNavigate()
   const [error, setError] = useState("")
   const [loading, setLoading] = useState(false)
   const [data,setData]=useState(
   {
      username:"",
      password:""
   }) 
  const change=(e)=>
  {
     setData({...data,[e.target.name]:e.target.value})
  }
   const logSubmit=async(event)=>
  {
    event.preventDefault()
    setError("")
    setLoading(true)
    try
    {
         const { data: user } = await api.post("/auth/login", {
            identifier: data.username,
            password: data.password,
         })
         localStorage.setItem("uname", user.username)
         localStorage.setItem("token", user.token)
         localStorage.setItem("role", user.role)
         localStorage.setItem("user", JSON.stringify(user))
         navigate("/dashboard")
    }
    catch(err)
    {
      setError(errMsg(err, "Unable to sign in. Check your details."))
    }
    finally { setLoading(false) }
  }
  return(
   <main className="auth-page">
      <section className="auth-art"><Link to="/" className="auth-brand"><span className="brand-mark">D</span><strong>drive<span>ops</span></strong></Link><div className="auth-art-copy"><span className="eyebrow">Operations, in motion</span><h1>Welcome back<br /><em>to the road.</em></h1></div></section>
      <section className="auth-panel"><div className="auth-form-wrap"><span className="eyebrow accent-eyebrow">Fleet intelligence platform</span><h2>Sign in to DriveOps</h2><p className="auth-subtitle">Keep your fleet moving with clarity.</p><form onSubmit={logSubmit}><label>Username<input required value={data.username} onChange={change} name="username" placeholder="Enter your username" autoComplete="username" /></label><label>Password<input required type="password" value={data.password} onChange={change} name="password" placeholder="Enter your password" autoComplete="current-password" /></label>{error && <div className="form-error">{error}</div>}<button className="auth-submit" disabled={loading}>{loading ? "Signing in..." : "Login"}<span>→</span></button></form><p className="auth-switch">New to DriveOps? <Link to="/reg">Create an account</Link></p></div><span className="auth-copyright">© 2026 DriveOps</span></section>
   </main>
  )
}
export default Login