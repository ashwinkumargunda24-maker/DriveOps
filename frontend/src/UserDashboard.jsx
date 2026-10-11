import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import api, { errMsg } from "./api"

function UserDashboard() {
  const [user, setUser] = useState(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    api.get("/auth/me")
      .then(({ data }) => {
        if (mounted) setUser(data)
      })
      .catch((requestError) => {
        if (mounted) setError(errMsg(requestError, "Unable to load your account."))
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => { mounted = false }
  }, [])

  return (
    <main>
      <h1>My account</h1>
      {loading && <p>Loading account...</p>}
      {error && <p role="alert">{error}</p>}
      {user && <>
        <h2>{user.fullName || user.username}</h2>
        <dl>
          <dt>Username</dt><dd>{user.username}</dd>
          <dt>Email</dt><dd>{user.email}</dd>
          <dt>Phone</dt><dd>{user.phone || "Not provided"}</dd>
          <dt>Role</dt><dd>{user.role}</dd>
          <dt>Branch</dt><dd>{user.branchName || "Not assigned"}</dd>
        </dl>
        <p><Link to="/update">Change password</Link></p>
        <p><Link to="/del">Account deletion information</Link></p>
      </>}
    </main>
  )
}

export default UserDashboard
