import { Link } from "react-router-dom"

function Delete() {
  return (
    <main>
      <h1>Account deletion</h1>
      <p>Self-service account deletion is not currently supported. Contact your fleet administrator to request account deactivation.</p>
      <Link to="/dboard">Back to account</Link>
    </main>
  )
}

export default Delete
