import { useEffect, useMemo, useState } from "react"
import api, { errMsg } from "./api"

const currency = (amount) => amount == null
  ? "—"
  : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount)

const percent = (value) => value == null ? "—" : `${value > 0 ? "+" : ""}${Number(value).toFixed(1)}%`

const monthOptions = () => {
  const now = new Date()
  const rows = []
  for (let i = 0; i < 24; i += 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    rows.push({
      year,
      month,
      value: `${year}-${String(month).padStart(2, "0")}`,
      label: date.toLocaleString("en-IN", { month: "long", year: "numeric" }),
    })
  }
  return rows
}

function FinanceDashboard({ role }) {
  const canAccessFinance = ["SUPER_ADMIN", "FINANCE_OFFICER"].includes(role)
  const periods = useMemo(monthOptions, [])
  const [period, setPeriod] = useState(periods[0]?.value || "")
  const [branchId, setBranchId] = useState("")
  const [branches, setBranches] = useState([])
  const [summary, setSummary] = useState(null)
  const [history, setHistory] = useState([])
  const [details, setDetails] = useState(null)
  const [reports, setReports] = useState([])
  const [revenueDrafts, setRevenueDrafts] = useState({})
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(true)

  const selected = periods.find((item) => item.value === period) || periods[0]
  const canRecordRevenue = ["FINANCE_OFFICER", "SUPER_ADMIN"].includes(role)
  const canReadReports = ["FINANCE_OFFICER", "SUPER_ADMIN"].includes(role)
  const canGenerateReports = role === "SUPER_ADMIN"

  const load = async () => {
    if (!canAccessFinance || !selected) return
    setLoading(true)
    setError("")
    try {
      const params = { year: selected.year, month: selected.month, branchId: branchId || undefined }
      const [summaryResult, historyResult, detailsResult] = await Promise.all([
        api.get("/finance/summary", { params }),
        api.get("/finance/history", { params: { months: 12, branchId: branchId || undefined } }),
        api.get("/finance/details", { params: { ...params, page: 0, size: 20 } }),
      ])
      setSummary(summaryResult.data)
      setHistory(historyResult.data?.months || [])
      setDetails(detailsResult.data)
      if (canReadReports) {
        const { data } = await api.get("/reports/monthly")
        setReports(Array.isArray(data) ? data : [])
      }
    } catch (requestError) {
      setError(errMsg(requestError, "Unable to load monthly finance data."))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    api.get("/branches", { params: { page: 0, size: 200 } })
      .then(({ data }) => setBranches(data.content || []))
      .catch(() => setBranches([]))
  }, [])

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, branchId, role])

  const exportCsv = async () => {
    try {
      const { data } = await api.get("/finance/export", {
        params: { year: selected.year, month: selected.month, branchId: branchId || undefined },
        responseType: "blob",
      })
      const url = URL.createObjectURL(new Blob([data], { type: "text/csv" }))
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = `finance-${selected.value}.csv`
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (requestError) {
      setError(errMsg(requestError, "Finance export failed."))
    }
  }

  const saveRevenue = async (tripId) => {
    const amount = revenueDrafts[tripId]
    if (amount == null || amount === "") {
      setError("Enter a revenue amount before saving.")
      return
    }
    setError("")
    try {
      await api.post(`/trips/${tripId}/revenue`, { revenueAmount: Number(amount) })
      setMessage(`Revenue saved for trip #${tripId}.`)
      setRevenueDrafts((current) => ({ ...current, [tripId]: "" }))
      await load()
    } catch (requestError) {
      setError(errMsg(requestError, "Unable to record trip revenue."))
    }
  }

  const generateReport = async (regenerate = false) => {
    setError("")
    setMessage("")
    try {
      const { data } = await api.post("/reports/monthly/generate", {
        year: selected.year,
        month: selected.month,
        regenerate,
      })
      setMessage(`Monthly snapshot ${data.period} is ${String(data.status || "").toLowerCase()}.`)
      await load()
    } catch (requestError) {
      setError(errMsg(requestError, "Unable to generate the monthly snapshot."))
    }
  }

  const maxHistory = Math.max(1, ...history.map((item) => Number(item.totalRevenue || 0) + Number(item.totalExpenses || 0)))
  const comparison = summary?.comparison || {}
  const metrics = [
    ["Revenue", currency(summary?.totalRevenue), comparison.revenueChangePercent],
    ["Approved expenses", currency(summary?.totalExpenses), comparison.expensesChangePercent],
    ["Net profit", summary?.profitAvailable ? currency(summary?.netProfit) : "Unavailable", comparison.profitChangePercent],
    ["Completed trips", summary?.completedTrips ?? 0, comparison.completedTripsChangePercent],
  ]

  if (!canAccessFinance) return null

  return (
    <div className="finance-dashboard">
      <section className="page-heading page-enter">
        <div>
          <span className="eyebrow accent-eyebrow">Monthly ledger</span>
          <h1>{summary?.monthLabel || "Finance"}</h1>
          <p>Revenue, approved expenses, and profit for the selected calendar month. Pending costs are not counted in profit.</p>
        </div>
        <div className="workspace-actions">
          <label className="workspace-filter">Month
            <select value={period} onChange={(event) => setPeriod(event.target.value)}>
              {periods.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          {branches.length > 1 && <label className="workspace-filter">Branch
            <select value={branchId} onChange={(event) => setBranchId(event.target.value)}>
              <option value="">All branches</option>
              {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
          </label>}
          <button type="button" className="secondary-button" onClick={exportCsv}>Export CSV</button>
        </div>
      </section>

      {error && <div className="form-error" role="alert">{error}</div>}
      {message && <div className="workspace-success" role="status">{message}</div>}
      {loading && <div className="panel" style={{ padding: 24 }}>Loading monthly finance...</div>}

      {!loading && summary && <>
        {!summary.profitAvailable && <div className="form-error" role="status">{summary.profitUnavailableReason}</div>}
        <section className="metric-grid page-enter delay-one" aria-label="Monthly finance metrics">
          {metrics.map(([title, value, change], index) => (
            <article className={`metric-card ${index === 0 ? "metric-highlight" : ""}`} key={title}>
              <div className="metric-top"><span className="metric-icon">₹</span><span className="trend">{percent(change)}</span></div>
              <strong>{value}</strong><p>{title}</p>
            </article>
          ))}
        </section>

        <section className="dashboard-grid page-enter delay-two">
          <article className="panel">
            <div className="panel-heading"><div><h2>12-month trend</h2><p>Revenue vs approved expenses</p></div></div>
            <div className="finance-bars">
              {history.slice().reverse().map((item) => (
                <div className="finance-bar-row" key={item.period}>
                  <span>{String(item.period).slice(5)}</span>
                  <div className="finance-bar-track">
                    <i className="revenue" style={{ width: `${Math.round((Number(item.totalRevenue || 0) / maxHistory) * 100)}%` }} />
                    <b className="expense" style={{ width: `${Math.round((Number(item.totalExpenses || 0) / maxHistory) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </article>
          <article className="panel attention-panel">
            <div className="panel-heading"><div><h2>This month</h2><p>Approved operating mix</p></div></div>
            <div className="attention-list">
              <div className="attention-item"><strong>Fuel</strong><span>{currency(summary.fuelExpenses)}</span></div>
              <div className="attention-item"><strong>Maintenance</strong><span>{currency(summary.maintenanceExpenses)}</span></div>
              <div className="attention-item"><strong>Other</strong><span>{currency(summary.otherExpenses)}</span></div>
              <div className="attention-item"><strong>Cost per km</strong><span>{summary.costPerKm == null ? "—" : currency(summary.costPerKm)}</span></div>
              <div className="attention-item"><strong>Pending approvals</strong><span>{summary.pendingExpenseApprovals} open · {summary.pendingExpenseApprovalsInMonth} in month</span></div>
            </div>
            <p className="panel-heading"><span>{summary.expenseDefinition}</span></p>
          </article>
        </section>

        <section className="panel fleet-panel page-enter delay-three">
          <div className="panel-heading"><div><h2>Completed trips</h2><p>Record revenue so monthly profit can close</p></div></div>
          {details?.trips?.content?.length ? (
            <div className="table-scroll"><table><thead><tr><th>Trip</th><th>Route</th><th>Vehicle</th><th>Status</th><th>Distance</th><th>Revenue</th>{canRecordRevenue && <th>Action</th>}</tr></thead><tbody>
              {details.trips.content.map((trip) => (
                <tr key={trip.id}>
                  <td>#{trip.id}</td>
                  <td>{trip.routeLabel || "—"}</td>
                  <td>{trip.vehicleReg || "—"}</td>
                  <td>{trip.status}</td>
                  <td>{trip.distanceKm ?? "—"}</td>
                  <td>{currency(trip.revenueAmount)}</td>
                  {canRecordRevenue && <td>
                    {trip.status === "COMPLETED" ? (
                      <span className="workspace-actions">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          aria-label={`Revenue for trip ${trip.id}`}
                          value={revenueDrafts[trip.id] ?? ""}
                          onChange={(event) => setRevenueDrafts((current) => ({ ...current, [trip.id]: event.target.value }))}
                          style={{ width: 110 }}
                        />
                        <button type="button" className="table-action approve" onClick={() => saveRevenue(trip.id)}>Save</button>
                      </span>
                    ) : "—"}
                  </td>}
                </tr>
              ))}
            </tbody></table></div>
          ) : <div className="empty-state"><strong>No trips in this month</strong><span>Completed trip revenue will appear here.</span></div>}
        </section>

        <section className="panel fleet-panel">
          <div className="panel-heading"><div><h2>Expense ledger</h2><p>Only approved rows count toward monthly profit</p></div></div>
          {details?.expenses?.content?.length ? (
            <div className="table-scroll"><table><thead><tr><th>Expense</th><th>Category</th><th>Amount</th><th>Date</th><th>Status</th><th>Vehicle</th></tr></thead><tbody>
              {details.expenses.content.map((expense) => (
                <tr key={expense.id}>
                  <td>#{expense.id}</td>
                  <td>{expense.category}</td>
                  <td>{currency(expense.amount)}</td>
                  <td>{expense.date || "—"}</td>
                  <td>{expense.status}</td>
                  <td>{expense.vehicleReg || "—"}</td>
                </tr>
              ))}
            </tbody></table></div>
          ) : <div className="empty-state"><strong>No expenses in this month</strong></div>}
        </section>

        {canReadReports && <section className="panel fleet-panel">
          <div className="panel-heading">
            <div><h2>Month-end snapshots</h2><p>{canGenerateReports ? "Frozen copies for Super Admin close-out" : "Snapshots scoped to your authorized organization"}</p></div>
            {canGenerateReports && <div className="workspace-actions">
              <button type="button" className="primary-button" onClick={() => generateReport(false)}>Generate selected month</button>
              <button type="button" className="secondary-button" onClick={() => generateReport(true)}>Regenerate</button>
            </div>}
          </div>
          {reports.length ? (
            <div className="table-scroll"><table><thead><tr><th>Period</th><th>Status</th><th>Revenue</th><th>Expenses</th><th>Profit</th><th>Version</th></tr></thead><tbody>
              {reports.map((report) => (
                <tr key={report.id}>
                  <td>{report.period}</td>
                  <td>{report.status}</td>
                  <td>{currency(report.totalRevenue)}</td>
                  <td>{currency(report.totalExpenses)}</td>
                  <td>{report.profitAvailable ? currency(report.netProfit) : "Unavailable"}</td>
                  <td>{report.snapshotVersion}</td>
                </tr>
              ))}
            </tbody></table></div>
          ) : <p>No snapshots yet.</p>}
        </section>}
      </>}
    </div>
  )
}

export default FinanceDashboard
