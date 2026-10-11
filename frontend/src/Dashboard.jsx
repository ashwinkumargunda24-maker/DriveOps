import { useEffect, useMemo, useState } from "react"
import api, { errMsg } from "./api"

const statusLabel = (status = "") => status.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
const currency = (amount = 0) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount)

const navItems = [
  ["Overview", "⌂"],
  ["Fleet", "▣"],
  ["Trips", "↗"],
  ["Maintenance", "⚙"],
  ["Drivers", "♙"],
  ["Expenses", "₹"],
]

function Dashboard() {
  const [activeNav, setActiveNav] = useState("Overview")
  const [activeFilter, setActiveFilter] = useState("All vehicles")
  const [query, setQuery] = useState("")
  const [showNotice, setShowNotice] = useState(false)
  const [vehicles, setVehicles] = useState([])
  const [overview, setOverview] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [loadError, setLoadError] = useState("")

  useEffect(() => {
    let mounted = true
    Promise.all([
      api.get("/dashboard"),
      api.get("/vehicles", { params: { page: 0, size: 100 } }),
      api.get("/notifications"),
    ])
      .then(([dashboard, vehiclePage, alerts]) => {
        if (!mounted) return
        setOverview(dashboard.data)
        setVehicles(vehiclePage.data.content || [])
        setNotifications(alerts.data || [])
      })
      .catch((error) => {
        if (mounted) setLoadError(errMsg(error, "Unable to load fleet data."))
      })
    return () => { mounted = false }
  }, [])

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((vehicle) => {
      const matchesFilter = activeFilter === "All vehicles" || statusLabel(vehicle.status) === activeFilter
      const haystack = `${vehicle.registrationNumber} ${vehicle.manufacturer || ""} ${vehicle.model || ""} ${vehicle.branchName}`.toLowerCase()
      return matchesFilter && haystack.includes(query.toLowerCase())
    })
  }, [vehicles, activeFilter, query])

  const utilization = overview?.totalVehicles
    ? Math.round(((overview.onTripVehicles + (overview.vehicleUtilization?.ASSIGNED || 0)) / overview.totalVehicles) * 100)
    : 0
  const displayName = overview?.user?.fullName || overview?.user?.username || localStorage.getItem("uname") || "there"
  const roleName = (overview?.role || localStorage.getItem("role") || "").replace(/_/g, " ").toLowerCase()
  const attentionItems = [
    { title: `${overview?.upcomingMaintenance?.length || 0} vehicles due for service`, detail: "Scheduled maintenance", section: "Maintenance" },
    { title: `${overview?.pendingAssignments || 0} trips awaiting assignment`, detail: "Planned trips", section: "Trips" },
    { title: `${overview?.expiringDocuments?.length || 0} documents expiring soon`, detail: "Next 30 days", section: "Documents" },
  ]

  return (
    <div className="driveops-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-mark">D</div>
          <div>
            <strong>drive<span>ops</span></strong>
            <small>Fleet intelligence</small>
          </div>
        </div>

        <div className="branch-switcher">
          <span className="eyebrow">Current branch</span>
          <button type="button" className="branch-button">All branches <span>⌄</span></button>
        </div>

        <nav className="primary-nav" aria-label="Main navigation">
          <span className="nav-label">Workspace</span>
          {navItems.map(([label, icon]) => (
            <button
              type="button"
              className={`nav-item ${activeNav === label ? "active" : ""}`}
              key={label}
              onClick={() => setActiveNav(label)}
            >
              <span className="nav-icon">{icon}</span>{label}
              {label === "Maintenance" && <span className="nav-count">3</span>}
            </button>
          ))}
          <span className="nav-label nav-label-lower">Administration</span>
          <button type="button" className="nav-item" onClick={() => setActiveNav("Reports")}><span className="nav-icon">▥</span>Reports</button>
          <button type="button" className="nav-item" onClick={() => setActiveNav("Settings")}><span className="nav-icon">◌</span>Settings</button>
        </nav>

        <div className="sidebar-bottom">
          <div className="help-card">
            <span className="help-icon">?</span>
            <div><strong>Need a hand?</strong><small>Open the operations guide</small></div>
            <span>→</span>
          </div>
          <div className="user-row">
            <div className="avatar avatar-small">AS</div>
            <div><strong>Alex Sharma</strong><small>Fleet manager</small></div>
            <button type="button" className="icon-button" aria-label="Open profile">•••</button>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="mobile-brand"><div className="brand-mark">D</div><strong>drive<span>ops</span></strong></div>
          <div className="breadcrumb"><span>Workspace</span><b>/</b><strong>{activeNav}</strong></div>
          <div className="topbar-actions">
            <button type="button" className="icon-button notification-button" aria-label="Notifications" onClick={() => setShowNotice(!showNotice)}>♢<i /></button>
            <div className="avatar">AS</div>
          </div>
        </header>

        {showNotice && <div className="notification-popover"><strong>All caught up</strong><span>No new operational alerts.</span></div>}

        <div className="content-wrap">
          <section className="page-heading page-enter">
            <div><span className="eyebrow accent-eyebrow">Saturday, 19 September 2026</span><h1>Good morning, Alex <span>✦</span></h1><p>Here is what is happening across your fleet today.</p></div>
            <button type="button" className="primary-button" onClick={() => setShowNotice(true)}><span>＋</span> Add vehicle</button>
          </section>

          <section className="metric-grid page-enter delay-one" aria-label="Fleet metrics">
            <article className="metric-card metric-highlight"><div className="metric-top"><span className="metric-icon">◈</span><span className="trend up">+8.4% <small>vs last month</small></span></div><strong>84.6<span>%</span></strong><p>Fleet utilization</p><div className="sparkline"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div></article>
            <article className="metric-card"><div className="metric-top"><span className="metric-icon neutral">▣</span><span className="trend up">+2 <small>this week</small></span></div><strong>48</strong><p>Total vehicles</p><div className="metric-foot"><span className="status-dot green"/>42 active <span className="status-dot amber"/>6 in service</div></article>
            <article className="metric-card"><div className="metric-top"><span className="metric-icon purple">↗</span><span className="trend up">+12.5% <small>vs last month</small></span></div><strong>126</strong><p>Trips this month</p><div className="metric-foot">Avg. trip distance <b>218 km</b></div></article>
            <article className="metric-card"><div className="metric-top"><span className="metric-icon red">⚠</span><span className="trend down">-6.2% <small>vs last month</small></span></div><strong>3</strong><p>Open incidents</p><div className="metric-foot">Requires attention <b className="red-text">Now</b></div></article>
          </section>

          <section className="dashboard-grid page-enter delay-two">
            <article className="panel utilization-panel">
              <div className="panel-heading"><div><h2>Fleet utilization</h2><p>Vehicle activity over the last 30 days</p></div><button className="select-button" type="button">Last 30 days <span>⌄</span></button></div>
              <div className="chart-wrap"><div className="chart-y"><span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0%</span></div><div className="chart"><div className="chart-gridlines"><i/><i/><i/><i/><i/></div><svg viewBox="0 0 720 220" preserveAspectRatio="none" role="img" aria-label="Fleet utilization trend"><defs><linearGradient id="areaFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#c95f3d" stopOpacity=".22"/><stop offset="1" stopColor="#c95f3d" stopOpacity="0"/></linearGradient></defs><path d="M0,148 C48,130 57,160 95,129 S145,105 174,124 S224,128 251,89 S299,103 327,74 S373,92 400,62 S452,79 479,52 S533,70 560,44 S613,62 642,28 S691,49 720,17 L720,220 L0,220 Z" fill="url(#areaFill)"/><path d="M0,148 C48,130 57,160 95,129 S145,105 174,124 S224,128 251,89 S299,103 327,74 S373,92 400,62 S452,79 479,52 S533,70 560,44 S613,62 642,28 S691,49 720,17" fill="none" stroke="#c95f3d" strokeWidth="3" strokeLinecap="round"/></svg><div className="chart-x"><span>Aug 21</span><span>Aug 27</span><span>Sep 02</span><span>Sep 08</span><span>Sep 14</span><span>Sep 19</span></div></div></div>
              <div className="chart-legend"><span><i className="legend-line"/>Utilization rate</span><span><i className="legend-dot"/>Target: 80%</span><b>Peak 91.2% <small>Sep 17</small></b></div>
            </article>

            <article className="panel attention-panel"><div className="panel-heading"><div><h2>Needs attention</h2><p>Items that need your review</p></div><button className="more-button" type="button" aria-label="More options">•••</button></div><div className="attention-list"><div className="attention-item"><div className="attention-icon warning">⚙</div><div><strong>3 vehicles due for service</strong><span>Next 7 days · Maintenance</span></div><button type="button">View <b>→</b></button></div><div className="attention-item"><div className="attention-icon danger">⚠</div><div><strong>1 incident awaiting review</strong><span>Reported 2 hours ago · Incident</span></div><button type="button">Review <b>→</b></button></div><div className="attention-item"><div className="attention-icon info">◷</div><div><strong>5 documents expiring soon</strong><span>Within 30 days · Compliance</span></div><button type="button">View <b>→</b></button></div></div><button type="button" className="text-button">View all alerts <span>→</span></button></article>
          </section>

          <section className="panel fleet-panel page-enter delay-three"><div className="panel-heading fleet-heading"><div><h2>Fleet overview</h2><p>Live status of every vehicle in your organization</p></div><button type="button" className="secondary-button">Export <span>↧</span></button></div><div className="table-toolbar"><div className="filter-tabs">{["All vehicles", "On trip", "Available", "Maintenance"].map((filter) => <button type="button" className={activeFilter === filter ? "selected" : ""} key={filter} onClick={() => setActiveFilter(filter)}>{filter}{filter === "All vehicles" && <small>48</small>}</button>)}</div><label className="search-box"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search fleet" /></label></div><div className="table-scroll"><table><thead><tr><th>Vehicle</th><th>Branch</th><th>Assigned driver</th><th>Status</th><th>Fuel level</th><th>Health</th><th /></tr></thead><tbody>{filteredVehicles.map((vehicle) => <tr key={vehicle.id}><td><div className="vehicle-cell"><div className="vehicle-avatar">▣</div><div><strong>{vehicle.id}</strong><span>{vehicle.type}</span></div></div></td><td>{vehicle.branch}</td><td>{vehicle.driver}</td><td><span className={`pill ${vehicle.status.toLowerCase().replace(" ", "-")}`}><i/>{vehicle.status}</span></td><td><div className="fuel-cell"><div className="fuel-bar"><i style={{ width: `${vehicle.fuel}%` }} /></div><span>{vehicle.fuel}%</span></div></td><td><span className={`health ${vehicle.health === "Due today" ? "due" : ""}`}>{vehicle.health}</span></td><td><button type="button" className="row-more" aria-label={`More options for ${vehicle.id}`}>•••</button></td></tr>)}</tbody></table></div><div className="table-footer"><span>Showing <b>{filteredVehicles.length}</b> of 48 vehicles</span><button type="button" className="text-button">View fleet <span>→</span></button></div></section>
        </div>
      </main>
    </div>
  )
}

export default Dashboard
