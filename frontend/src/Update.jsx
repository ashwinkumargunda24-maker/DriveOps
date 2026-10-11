import { useState } from "react"
import { Link } from "react-router-dom"
import api, { errMsg } from "./api"

function Update() {
  const [data, setData] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" })
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [saving, setSaving] = useState(false)

  const change = (event) => {
    setData({ ...data, [event.target.name]: event.target.value })
  }

  const update = async (event) => {
    event.preventDefault()
    setError("")
    setMessage("")
    if (data.newPassword !== data.confirmPassword) {
      setError("New password and confirmation do not match.")
      return
    }
    setSaving(true)
    try {
      const { data: result } = await api.post("/auth/change-password", {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      })
      setMessage(result.message || "Password changed successfully.")
      setData({ currentPassword: "", newPassword: "", confirmPassword: "" })
    } catch (requestError) {
      setError(errMsg(requestError, "Unable to change your password."))
    } finally {
      setSaving(false)
    }
  }

  return (
    <main>
      <h1>Change password</h1>
      <form onSubmit={update}>
        <label>
          Current password
          <input required type="password" name="currentPassword" autoComplete="current-password" value={data.currentPassword} onChange={change} />
        </label>
        <label>
          New password
          <input required minLength="8" type="password" name="newPassword" autoComplete="new-password" value={data.newPassword} onChange={change} />
        </label>
        <label>
          Confirm new password
          <input required minLength="8" type="password" name="confirmPassword" autoComplete="new-password" value={data.confirmPassword} onChange={change} />
        </label>
        {error && <p role="alert">{error}</p>}
        {message && <p role="status">{message}</p>}
        <button type="submit" disabled={saving}>{saving ? "Updating..." : "Update password"}</button>
      </form>
      <p><Link to="/dboard">Back to account</Link></p>
    </main>
  )
}

export default Update
