import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import api, { errMsg } from "./api"
import FinanceDashboard from "./FinanceDashboard"
import FleetWorkspace from "./FleetWorkspace"

const statusFilters = [
  ["All vehicles", ""],
  ["On trip", "ON_TRIP"],
  ["Available", "AVAILABLE"],
  ["Maintenance", "MAINTENANCE"],
]

const currency = (amount = 0) => new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
}).format(amount || 0)

const label = (value = "") => value.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())

const metricSets = {
  SUPER_ADMIN: (data) => [
    ["Organizations", data.organizations],
    ["Branches", data.branches],
    ["Vehicles", data.totalVehicles],
    ["Users", data.totalUsers],
  ],
  FLEET_MANAGER: (data) => [
    ["Total vehicles", data.totalVehicles],
    ["Available", data.availableVehicles],
    ["Active trips", data.activeTrips],
    ["Under maintenance", data.maintenanceVehicles],
  ],
  BRANCH_MANAGER: (data) => [
    ["Branch vehicles", data.totalVehicles],
    ["Branch drivers", data.totalDrivers],
    ["Active trips", data.activeTrips],
    ["Pending assignments", data.pendingAssignments],
  ],
  FINANCE_OFFICER: (data) => [
    ["Operational cost", currency(data.totalExpenses)],
    ["Fuel cost", currency(data.fuelCost)],
    ["Maintenance cost", currency(data.maintenanceCost)],
    ["Cost per km", currency(data.costPerKm)],
  ],
  DRIVER: (data) => [
    ["My trips", data.myTrips?.length || 0],
    ["Current trip", data.myTrips?.filter((trip) => ["STARTED", "DELAYED"].includes(trip.status)).length || 0],
    ["Assigned vehicle", data.myVehicleId ? `#${data.myVehicleId}` : "None"],
    ["Trip history", data.myTrips?.filter((trip) => trip.status === "COMPLETED").length || 0],
  ],
}

function OperationsDashboard() {
  const navigate = useNavigate()
  const [overview, setOverview] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [driverSection, setDriverSection] = useState("dashboard")
  const [driverVehicle, setDriverVehicle] = useState(null)
  const [driverFinance, setDriverFinance] = useState({ fuel: [], expenses: [] })
  const [driverForm, setDriverForm] = useState("")
  const [fuelDraft, setFuelDraft] = useState({ quantity: "", pricePerLiter: "", odometer: "", fuelStation: "" })
  const [expenseDraft, setExpenseDraft] = useState({ category: "TOLL", amount: "", date: new Date().toISOString().slice(0, 10), description: "" })
  const [incidentDraft, setIncidentDraft] = useState({ incidentType: "ACCIDENT", severity: "MEDIUM", location: "", description: "", photo: null })
  const [passwordDraft, setPasswordDraft] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" })
  const [incidentSaving, setIncidentSaving] = useState(false)
  const [incidentMessage, setIncidentMessage] = useState("")
  const [message, setMessage] = useState("")
  const [vehiclePage, setVehiclePage] = useState({ content: [], totalPages: 0, totalElements: 0 })
  const [status, setStatus] = useState("")
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(0)
  const [showNotice, setShowNotice] = useState(false)
  const [showManagement, setShowManagement] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [workspaceView, setWorkspaceView] = useState("overview")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [clockNow, setClockNow] = useState(() => Date.now())

  useEffect(() => {
    let mounted = true
    Promise.all([api.get("/dashboard"), api.get("/notifications")])
      .then(([dashboard, alerts]) => {
        if (!mounted) return
        setOverview(dashboard.data)
        setNotifications(alerts.data || [])
        if (dashboard.data.role === "DRIVER") {
          const assignedTrip = (dashboard.data.myTrips || []).find((trip) => ["ASSIGNED", "STARTED", "DELAYED"].includes(trip.status))
          const vehicleId = dashboard.data.myVehicleId || assignedTrip?.vehicleId
          const vehicleRequest = vehicleId
            ? api.get(`/vehicles/${vehicleId}/history`)
            : Promise.resolve({ data: null })
          vehicleRequest.then((result) => {
            if (!mounted) return
            setDriverVehicle(result.data?.vehicle || null)
          }).catch((requestError) => {
            if (mounted) setError(errMsg(requestError, "Unable to load your assigned vehicle."))
          })
          Promise.all([api.get("/fuel", { params: { page: 0, size: 20 } }), api.get("/expenses", { params: { page: 0, size: 20 } })])
            .then(([fuel, expenses]) => {
              if (!mounted) return
              setDriverFinance({ fuel: fuel.data.content || [], expenses: expenses.data.content || [] })
            })
            .catch((requestError) => {
              if (mounted) setError(errMsg(requestError, "Unable to load your fuel and expenses."))
            })
        }
      })
      .catch((requestError) => {
        if (mounted) setError(errMsg(requestError, "Unable to load your dashboard."))
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    const interval = window.setInterval(() => setClockNow(Date.now()), 30_000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    if (localStorage.getItem("role") === "DRIVER") return
    let mounted = true
    api.get("/vehicles", { params: { q: query || undefined, status: status || undefined, page, size: 10 } })
      .then(({ data }) => {
        if (mounted) setVehiclePage(data)
      })
      .catch((requestError) => {
        if (mounted) setError(errMsg(requestError, "Unable to load vehicles."))
      })
    return () => { mounted = false }
  }, [query, status, page])

  const role = overview?.role || localStorage.getItem("role")
  const canSeeFinance = ["SUPER_ADMIN", "FINANCE_OFFICER"].includes(role)
  const metrics = useMemo(() => metricSets[role]?.(overview || {}) || [], [role, overview])

  useEffect(() => {
    if (role === "FINANCE_OFFICER") setWorkspaceView("finance")
  }, [role])
  const displayName = overview?.user?.fullName || overview?.user?.username || localStorage.getItem("uname") || "there"
  const vehicleStatuses = overview?.vehicleUtilization || {}
  const totalVehicles = overview?.totalVehicles || 0
  const notices = [
    { title: `${overview?.upcomingMaintenance?.length || 0} vehicles due for service`, detail: "Scheduled maintenance" },
    { title: `${overview?.expiringDocuments?.length || 0} documents expiring soon`, detail: "Within 30 days" },
    ...(canSeeFinance ? [{ title: `${overview?.pendingExpenses || 0} expenses awaiting review`, detail: "Finance approvals" }] : []),
  ]
  const vehicleStatusRows = ["AVAILABLE", "ASSIGNED", "ON_TRIP", "MAINTENANCE", "INACTIVE"]
  const utilizationPercent = totalVehicles ? Math.round(((vehicleStatuses.ON_TRIP || 0) + (vehicleStatuses.ASSIGNED || 0)) * 100 / totalVehicles) : 0

  const markRead = async (notification) => {
    try {
      await api.post(`/notifications/${notification.id}/read`)
      setNotifications((items) => items.map((item) => item.id === notification.id ? { ...item, read: true } : item))
    } catch (requestError) {
      setError(errMsg(requestError, "Unable to update notification."))
    }
  }

  const logout = async () => {
    try {
      await api.post("/auth/logout")
    } finally {
      ["token", "uname", "role", "user"].forEach((key) => localStorage.removeItem(key))
      navigate("/log")
    }
  }

  const driverNavigation = [
    ["dashboard", "🏠", "Dashboard"],
    ["trips", "🚚", "My Trips"],
    ["history", "📜", "Trip History"],
    ["finance", "⛽", "Fuel & Expenses"],
    ["incident", "⚠️", "Report Incident"],
    ["profile", "👤", "My Profile"],
  ]

  const driverTrips = overview?.myTrips || []
  const currentDate = new Date()
  const today = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(currentDate.getDate()).padStart(2, "0")}`
  const ongoingDriverTrip = driverTrips.find((trip) => ["STARTED", "DELAYED"].includes(trip.status)) || null
  const todayDriverTrip = driverTrips.find((trip) => trip.startDate?.slice(0, 10) === today
    && ["ASSIGNED", "STARTED", "DELAYED"].includes(trip.status)) || null
  const currentDriverTrip = ongoingDriverTrip || todayDriverTrip
  const canStartCurrentDriverTrip = currentDriverTrip?.status === "ASSIGNED"
    && Number.isFinite(Date.parse(currentDriverTrip.startDate))
    && Date.parse(currentDriverTrip.startDate) <= clockNow
  const historicalDriverTrips = driverTrips.filter((trip) => trip.status === "COMPLETED")
  const assignedVehicleId = currentDriverTrip?.vehicleId || todayDriverTrip?.vehicleId || overview?.myVehicleId
  const incidentTrip = currentDriverTrip || todayDriverTrip
  const driverRecentItems = [
    ...driverFinance.expenses
      .filter((expense) => String(expense.category || "").toUpperCase() !== "FUEL")
      .map((expense) => ({ id: `expense-${expense.id}`, amount: expense.amount, category: expense.category, status: expense.status, date: expense.date })),
    ...driverFinance.fuel.map((fuel) => ({ id: `fuel-${fuel.id}`, amount: fuel.totalCost, category: "FUEL", status: fuel.status || "PENDING", date: fuel.date })),
  ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)).slice(0, 10)
  const greeting = new Date().getHours() < 12 ? "Good Morning" : new Date().getHours() < 17 ? "Good Afternoon" : "Good Evening"
  const goToDriverSection = (section) => {
    if (section === "incident") {
      setDriverSection(section)
      setIncidentMessage("")
      setError("")
      setShowNotice(false)
      return
    }
    setDriverSection(section)
    setShowNotice(false)
  }

  const submitIncident = async (event) => {
    event.preventDefault()
    setIncidentSaving(true)
    setIncidentMessage("")
    setError("")
    try {
      const payload = new FormData()
      Object.entries({
        incidentType: incidentDraft.incidentType,
        severity: incidentDraft.severity,
        location: incidentDraft.location,
        description: incidentDraft.description,
        tripId: incidentTrip?.id,
        vehicleId: incidentTrip?.vehicleId,
        occurredAt: new Date().toISOString().slice(0, 16),
      }).forEach(([key, value]) => { if (value != null) payload.append(key, value) })
      if (incidentDraft.photo) payload.append("photo", incidentDraft.photo)
      await api.post("/incidents", payload)
      setIncidentDraft({ incidentType: "ACCIDENT", severity: "MEDIUM", location: "", description: "", photo: null })
      setIncidentMessage("Incident reported successfully.")
    } catch (requestError) {
      setError(errMsg(requestError, "Unable to report incident."))
    } finally {
      setIncidentSaving(false)
    }
  }

  const setTripStatus = async (nextStatus) => {
    if (!currentDriverTrip) return
    if (nextStatus === "STARTED" && (!currentDriverTrip.startDate
      || !Number.isFinite(Date.parse(currentDriverTrip.startDate))
      || Date.parse(currentDriverTrip.startDate) > Date.now())) return
    setError("")
    try {
      await api.post(`/trips/${currentDriverTrip.id}/status`, { status: nextStatus })
      const { data } = await api.get("/dashboard")
      setOverview(data)
      if (data.myVehicleId) {
        const { data: history } = await api.get(`/vehicles/${data.myVehicleId}/history`)
        setDriverVehicle(history.vehicle || null)
      } else if (nextStatus === "COMPLETED") {
        setDriverVehicle(null)
      }
    } catch (requestError) {
      setError(errMsg(requestError, "Unable to update trip status."))
    }
  }

  const submitFuel = async (event) => {
    event.preventDefault()
    if (!assignedVehicleId) {
      setError("A vehicle must be assigned before adding fuel.")
      return
    }
    setError("")
    try {
      await api.post("/fuel", {
        vehicleId: assignedVehicleId,
        quantity: Number(fuelDraft.quantity),
        pricePerLiter: Number(fuelDraft.pricePerLiter),
        odometer: Number(fuelDraft.odometer),
        fuelStation: fuelDraft.fuelStation,
        date: new Date().toISOString().slice(0, 10),
      })
      const [fuel, expenses] = await Promise.all([
        api.get("/fuel", { params: { page: 0, size: 20 } }),
        api.get("/expenses", { params: { page: 0, size: 20 } }),
      ])
      setDriverFinance({ fuel: fuel.data.content || [], expenses: expenses.data.content || [] })
      setFuelDraft({ quantity: "", pricePerLiter: "", odometer: "", fuelStation: "" })
      setDriverForm("")
    } catch (requestError) {
      setError(errMsg(requestError, "Unable to add fuel record."))
    }
  }

  const submitExpense = async (event) => {
    event.preventDefault()
    if (!assignedVehicleId) {
      setError("A vehicle must be assigned before adding an expense.")
      return
    }
    setError("")
    try {
      await api.post("/expenses", {
        vehicleId: assignedVehicleId,
        tripId: currentDriverTrip?.id,
        category: expenseDraft.category,
        amount: Number(expenseDraft.amount),
        date: expenseDraft.date,
        description: expenseDraft.description,
      })
      const { data } = await api.get("/expenses", { params: { page: 0, size: 20 } })
      setDriverFinance((current) => ({ ...current, expenses: data.content || [] }))
      setExpenseDraft({ category: "TOLL", amount: "", date: new Date().toISOString().slice(0, 10), description: "" })
      setDriverForm("")
    } catch (requestError) {
      setError(errMsg(requestError, "Unable to add expense."))
    }
  }

  const changePassword = async (event) => {
    event.preventDefault()
    setError("")
    setMessage("")
    if (passwordDraft.newPassword !== passwordDraft.confirmPassword) {
      setError("New password and confirmation do not match.")
      return
    }
    try {
      const { data } = await api.post("/auth/change-password", {
        currentPassword: passwordDraft.currentPassword,
        newPassword: passwordDraft.newPassword,
      })
      setMessage(data.message || "Password changed successfully.")
      setPasswordDraft({ currentPassword: "", newPassword: "", confirmPassword: "" })
    } catch (requestError) {
      setError(errMsg(requestError, "Unable to change password."))
    }
  }

  if (showManagement && role !== "DRIVER") {
    return (
      <div className="driveops-shell">
        {mobileNavOpen && <button type="button" className="mobile-nav-backdrop" aria-label="Close navigation menu" onClick={() => setMobileNavOpen(false)} />}
        <aside className={`sidebar ${mobileNavOpen ? "mobile-open" : ""}`}>
          <div className="brand-lockup">
            <div className="brand-mark">D</div>
            <div><strong>drive<span>ops</span></strong><small>Fleet intelligence</small></div>
          </div>
          <div className="branch-switcher">
            <span className="eyebrow">Signed in as</span>
            <div className="branch-button">{label(role || "")}</div>
          </div>
          <nav className="primary-nav" aria-label="Management navigation" id="management-navigation" onClick={() => setMobileNavOpen(false)}>
            <button type="button" className="nav-item" onClick={() => setShowManagement(false)}>
              <span className="nav-icon">←</span>Back to dashboard
            </button>
          </nav>
        </aside>
        <main className="main-content">
          <header className="topbar mobile-management-topbar">
            <button
              type="button"
              className="mobile-nav-toggle"
              aria-label={mobileNavOpen ? "Close navigation" : "Open navigation"}
              aria-controls="management-navigation"
              aria-expanded={mobileNavOpen}
              onClick={() => setMobileNavOpen((open) => !open)}
            >☰</button>
            <div className="mobile-brand"><div className="brand-mark">D</div><strong>drive<span>ops</span></strong></div>
          </header>
          <div style={{ paddingTop: "1rem" }}>
          <FleetWorkspace />
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="driveops-shell">
      {mobileNavOpen && <button type="button" className="mobile-nav-backdrop" aria-label="Close navigation menu" onClick={() => setMobileNavOpen(false)} />}
      <aside className={`sidebar ${mobileNavOpen ? "mobile-open" : ""}`}>
        <div className="brand-lockup">
          <div className="brand-mark">D</div>
          <div><strong>drive<span>ops</span></strong><small>Fleet intelligence</small></div>
        </div>
        <div className="branch-switcher">
          <span className="eyebrow">Signed in as</span>
          <div className="branch-button">{label(role || "")}</div>
        </div>
        <nav className="primary-nav" aria-label="Main navigation" id="main-navigation" onClick={() => setMobileNavOpen(false)}>
          {role === "DRIVER" ? driverNavigation.map(([section, icon, title]) => (
            <button
              key={section}
              type="button"
              className={`nav-item ${driverSection === section ? "active" : ""}`}
              onClick={() => goToDriverSection(section)}
            >
              <span className="nav-icon">{icon}</span>{title}
            </button>
          )) : <>
            <span className="nav-label">Workspace</span>
            <button type="button" className={`nav-item ${workspaceView === "overview" ? "active" : ""}`} onClick={() => { setShowManagement(false); setWorkspaceView("overview") }}>
              <span className="nav-icon">⌂</span>Overview
            </button>
            {canSeeFinance && <button type="button" className={`nav-item ${workspaceView === "finance" ? "active" : ""}`} onClick={() => { setShowManagement(false); setWorkspaceView("finance") }}>
              <span className="nav-icon">₹</span>Finance
            </button>}
            <a className="nav-item" href="#fleet" onClick={() => setWorkspaceView("overview")}><span className="nav-icon">▣</span>Vehicles</a>
            <button type="button" className="nav-item" onClick={() => setShowManagement(true)} style={{ border: "none", background: "transparent", textAlign: "left", width: "100%" }}>
              <span className="nav-icon">☷</span>Management
            </button>
            <a className="nav-item" href="#alerts" onClick={() => setWorkspaceView("overview")}><span className="nav-icon">⚠</span>Alerts</a>
          </>}
        </nav>
        <div className="sidebar-bottom">
          <div className="user-row">
            <div className="avatar avatar-small">{displayName.slice(0, 2).toUpperCase()}</div>
            <div><strong>{displayName}</strong><small>{label(role || "")}</small></div>
            <button type="button" className="icon-button" onClick={() => { setMobileNavOpen(false); logout() }} aria-label="Sign out" title="Sign out">↪</button>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button
            type="button"
            className="mobile-nav-toggle"
            aria-label={mobileNavOpen ? "Close navigation" : "Open navigation"}
            aria-controls="main-navigation"
            aria-expanded={mobileNavOpen}
            onClick={() => setMobileNavOpen((open) => !open)}
          >☰</button>
          <div className="mobile-brand"><div className="brand-mark">D</div><strong>drive<span>ops</span></strong></div>
          <div className="breadcrumb"><span>Workspace</span><b>/</b><strong>{role === "DRIVER" ? driverNavigation.find(([section]) => section === driverSection)?.[2] : workspaceView === "finance" ? "Finance" : "Overview"}</strong></div>
          <div className="topbar-actions">
            {role !== "DRIVER" && <button type="button" className="icon-button notification-button" aria-label="Notifications" onClick={() => setShowNotice(!showNotice)}>♢{notifications.some((item) => !item.read) && <i />}</button>}
            <div className="avatar">{displayName.slice(0, 2).toUpperCase()}</div>
          </div>
        </header>

        {showNotice && <div className="notification-popover" role="region" aria-label="Notifications">
          <strong>Notifications</strong>
          {notifications.length === 0 ? <span>No notifications yet.</span> : notifications.slice(0, 8).map((item) => (
            <button className="live-notification" key={item.id} type="button" onClick={() => markRead(item)}>
              <b>{item.title}</b><span>{item.message}</span><small>{item.read ? "Read" : "Mark as read"}</small>
            </button>
          ))}
        </div>}

        <div className="content-wrap">
          {error && <div className="form-error" role="alert">{error}</div>}
          {role === "DRIVER" && !loading && <>
            {driverSection === "dashboard" && <>
              <section className="page-heading page-enter"><div><h1>{greeting}, {displayName.split(" ")[0]}</h1></div></section>
              <section className="panel attention-panel" id="alerts">
                <div className="panel-heading"><div><h2>Today’s Trip</h2></div></div>
                {currentDriverTrip ? <div className="attention-list">
                  <h2>{currentDriverTrip.routeSource || "-"} → {currentDriverTrip.routeDestination || "-"}</h2>
                  <div className="attention-item"><strong>🚚 Vehicle</strong><span>{currentDriverTrip.vehicleReg || driverVehicle?.registrationNumber || "Not assigned"}</span></div>
                  <div className="attention-item"><strong>🕐 Time</strong><span>{currentDriverTrip.startDate ? new Date(currentDriverTrip.startDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Not scheduled"}</span></div>
                  <div className="attention-item"><strong>Distance</strong><span>{currentDriverTrip.distanceKm == null ? "Not set" : `${currentDriverTrip.distanceKm} km`}</span></div>
                  {currentDriverTrip.status === "ASSIGNED" && <button type="button" className="primary-button" disabled={!canStartCurrentDriverTrip} onClick={() => setTripStatus("STARTED")}>START TRIP</button>}
                  {currentDriverTrip.status === "STARTED" && <div className="workspace-form-buttons"><strong>Trip Started</strong><button type="button" className="secondary-button" onClick={() => setTripStatus("DELAYED")}>MARK DELAYED</button><button type="button" className="primary-button" onClick={() => setTripStatus("COMPLETED")}>COMPLETE TRIP</button></div>}
                  {currentDriverTrip.status === "DELAYED" && <div className="workspace-form-buttons"><strong>Trip Delayed</strong><button type="button" className="primary-button" onClick={() => setTripStatus("COMPLETED")}>COMPLETE TRIP</button></div>}
                </div> : <div className="attention-list"><strong>No trip assigned today</strong></div>}
              </section>
            </>}
            {driverSection === "trips" && <section className="panel fleet-panel">
              <div className="panel-heading"><div><h2>Today’s Trip</h2></div></div>
              {currentDriverTrip ? <div className="attention-list">
                <h2>{currentDriverTrip.routeSource || "-"} → {currentDriverTrip.routeDestination || "-"}</h2>
                {[["Vehicle", currentDriverTrip.vehicleReg || driverVehicle?.registrationNumber || "-"], ["Time", currentDriverTrip.startDate ? new Date(currentDriverTrip.startDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Not scheduled"], ["Distance", currentDriverTrip.distanceKm == null ? "Not set" : `${currentDriverTrip.distanceKm} km`], ["Status", label(currentDriverTrip.status)]].map(([name, value]) => <div className="attention-item" key={name}><strong>{name}</strong><span>{value}</span></div>)}
                {currentDriverTrip.status === "ASSIGNED" && <button type="button" className="primary-button" disabled={!canStartCurrentDriverTrip} onClick={() => setTripStatus("STARTED")}>START TRIP</button>}
                {currentDriverTrip.status === "STARTED" && <div className="workspace-form-buttons"><strong>Trip Started</strong><button type="button" className="secondary-button" onClick={() => setTripStatus("DELAYED")}>MARK DELAYED</button><button type="button" className="primary-button" onClick={() => setTripStatus("COMPLETED")}>COMPLETE TRIP</button></div>}
                {currentDriverTrip.status === "DELAYED" && <div className="workspace-form-buttons"><strong>Trip Delayed</strong><button type="button" className="primary-button" onClick={() => setTripStatus("COMPLETED")}>COMPLETE TRIP</button></div>}
              </div> : <p>No trip assigned today.</p>}
            </section>}
            {driverSection === "incident" && <section className="panel fleet-panel">
              <div className="panel-heading"><div><h2>Report Incident</h2><p>Submit an incident report to your fleet team</p></div></div>
              {incidentMessage && <div className="workspace-success" role="status">{incidentMessage}</div>}
              <form className="workspace-form" onSubmit={submitIncident}>
                <div className="workspace-fields">
                  <label>Incident type
                    <select required value={incidentDraft.incidentType} onChange={(event) => setIncidentDraft({ ...incidentDraft, incidentType: event.target.value })}>
                      {["ACCIDENT", "VEHICLE_BREAKDOWN", "ROAD_HAZARD", "CARGO_ISSUE", "OTHER"].map((type) => <option key={type} value={type}>{label(type)}</option>)}
                    </select>
                  </label>
                  <label>Severity
                    <select required value={incidentDraft.severity} onChange={(event) => setIncidentDraft({ ...incidentDraft, severity: event.target.value })}>
                      {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((severity) => <option key={severity} value={severity}>{label(severity)}</option>)}
                    </select>
                  </label>
                  <label>Location
                    <input value={incidentDraft.location} onChange={(event) => setIncidentDraft({ ...incidentDraft, location: event.target.value })} placeholder="Where did it happen?" />
                  </label>
                  <label>Description
                    <textarea required rows="5" value={incidentDraft.description} onChange={(event) => setIncidentDraft({ ...incidentDraft, description: event.target.value })} placeholder="Describe what happened" />
                  </label>
                  <label>Photo (optional)
                    <input type="file" accept="image/*" onChange={(event) => setIncidentDraft({ ...incidentDraft, photo: event.target.files?.[0] || null })} />
                  </label>
                </div>
                <div className="workspace-form-buttons">
                  <button className="primary-button" type="submit" disabled={incidentSaving}>{incidentSaving ? "Submitting..." : "Submit report"}</button>
                </div>
              </form>
            </section>}
            {driverSection === "history" && <section className="panel fleet-panel">
              <div className="panel-heading"><div><h2>Completed Trips</h2></div></div>
              <div className="attention-list">
                {historicalDriverTrips.map((trip) => <article className="attention-item" key={trip.id}>
                  <div><strong>{trip.startDate ? new Date(trip.startDate).toLocaleDateString("en", { month: "short", day: "numeric" }) : "Previous trip"}</strong><span>{trip.routeSource || "-"} → {trip.routeDestination || "-"}</span></div>
                  <span>Completed</span>
                </article>)}
                {historicalDriverTrips.length === 0 && <p>No completed trips yet.</p>}
              </div>
            </section>}
            {driverSection === "finance" && <section className="panel fleet-panel">
              <div className="panel-heading"><div><h2>Fuel &amp; Expenses</h2><p>Submit fuel records and trip expenses</p></div></div>
              <div className="workspace-form-buttons">
                <button type="button" className="primary-button" onClick={() => setDriverForm(driverForm === "fuel" ? "" : "fuel")}>＋ Add Fuel</button>
                <button type="button" className="primary-button" onClick={() => setDriverForm(driverForm === "expense" ? "" : "expense")}>＋ Add Expense</button>
              </div>
              {driverForm === "fuel" && <form className="workspace-form" onSubmit={submitFuel}>
                <div className="workspace-fields">
                  <label>Quantity (L)<input required min="0.01" step="any" type="number" value={fuelDraft.quantity} onChange={(event) => setFuelDraft({ ...fuelDraft, quantity: event.target.value })} /></label>
                  <label>Price per liter<input required min="0.01" step="any" type="number" value={fuelDraft.pricePerLiter} onChange={(event) => setFuelDraft({ ...fuelDraft, pricePerLiter: event.target.value })} /></label>
                  <label>Odometer (km)<input required min="0" step="1" type="number" value={fuelDraft.odometer} onChange={(event) => setFuelDraft({ ...fuelDraft, odometer: event.target.value })} /></label>
                  <label>Fuel station<input value={fuelDraft.fuelStation} onChange={(event) => setFuelDraft({ ...fuelDraft, fuelStation: event.target.value })} /></label>
                </div>
                <div className="workspace-form-buttons"><button className="primary-button" type="submit">Save fuel</button><button className="secondary-button" type="button" onClick={() => setDriverForm("")}>Cancel</button></div>
              </form>}
              {driverForm === "expense" && <form className="workspace-form" onSubmit={submitExpense}>
                <div className="workspace-fields">
                  <label>Expense type<select value={expenseDraft.category} onChange={(event) => setExpenseDraft({ ...expenseDraft, category: event.target.value })}>{["TOLL", "PARKING", "DRIVER_ALLOWANCE", "OTHER"].map((category) => <option key={category} value={category}>{label(category)}</option>)}</select></label>
                  <label>Amount (₹)<input required min="0.01" step="any" type="number" value={expenseDraft.amount} onChange={(event) => setExpenseDraft({ ...expenseDraft, amount: event.target.value })} /></label>
                  <label>Date<input required type="date" value={expenseDraft.date} onChange={(event) => setExpenseDraft({ ...expenseDraft, date: event.target.value })} /></label>
                  <label>Description<input value={expenseDraft.description} onChange={(event) => setExpenseDraft({ ...expenseDraft, description: event.target.value })} /></label>
                </div>
                <div className="workspace-form-buttons"><button className="primary-button" type="submit">Submit expense</button><button className="secondary-button" type="button" onClick={() => setDriverForm("")}>Cancel</button></div>
              </form>}
              <h3>Recent</h3>
              <div className="attention-list">
                {driverRecentItems.map((item) => <article className="attention-item" key={item.id}><strong>{currency(item.amount)}</strong><span>{label(item.category)}</span><span>{label(item.status)}</span></article>)}
                {driverRecentItems.length === 0 && <p>No fuel or expenses yet.</p>}
              </div>
            </section>}
            {driverSection === "profile" && <section className="panel fleet-panel">
              <div className="panel-heading"><div><h2>My Profile</h2></div></div>
              <div className="attention-list">{[
                ["Name", overview?.driverProfile?.name || displayName],
                ["Phone", overview?.driverProfile?.phone || "-"],
                ["License number", overview?.driverProfile?.licenseNumber || "-"],
                ["License expiry", overview?.driverProfile?.licenseExpiry || "-"],
              ].map(([name, value]) => <div className="attention-item" key={name}><strong>{name}</strong><span>{value}</span></div>)}</div>
              <h3>Change password</h3>
              {message && <div className="workspace-success" role="status">{message}</div>}
              <form className="workspace-form" onSubmit={changePassword}>
                <div className="workspace-fields">
                  <label>Current password<input type="password" required autoComplete="current-password" value={passwordDraft.currentPassword} onChange={(event) => setPasswordDraft({ ...passwordDraft, currentPassword: event.target.value })} /></label>
                  <label>New password<input type="password" required minLength="8" autoComplete="new-password" value={passwordDraft.newPassword} onChange={(event) => setPasswordDraft({ ...passwordDraft, newPassword: event.target.value })} /></label>
                  <label>Confirm new password<input type="password" required minLength="8" autoComplete="new-password" value={passwordDraft.confirmPassword} onChange={(event) => setPasswordDraft({ ...passwordDraft, confirmPassword: event.target.value })} /></label>
                </div>
                <div className="workspace-form-buttons"><button className="primary-button" type="submit">Change password</button></div>
              </form>
            </section>}
          </>}

          {role === "DRIVER" && loading && <div className="panel" style={{ padding: 24 }}>Loading your driver workspace...</div>}

          {role !== "DRIVER" && workspaceView === "finance" && canSeeFinance && <FinanceDashboard role={role} />}

          {role !== "DRIVER" && workspaceView !== "finance" && <>
          <section className="page-heading page-enter" id="overview">
            <div>
              <span className="eyebrow accent-eyebrow">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
              <h1>{greeting}, {displayName.split(" ")[0]}</h1>
              <p>{label(role || "")} operations overview</p>
            </div>
          </section>

          {loading ? <div className="panel" style={{ padding: 24 }}>Loading your fleet data...</div> : (
            <>
              <section className="metric-grid page-enter delay-one" aria-label={`${label(role || "")} metrics`}>
                {metrics.map(([title, value], index) => <article className={`metric-card ${index === 0 ? "metric-highlight" : ""}`} key={title}>
                  <div className="metric-top"><span className="metric-icon">{["◈", "▣", "↗", "₹"][index]}</span><span className="trend">{label(role || "")}</span></div>
                  <strong>{value ?? 0}</strong><p>{title}</p>
                </article>)}
              </section>

              <section
                className="dashboard-grid page-enter delay-two"
                style={role === "FINANCE_OFFICER" || role === "DRIVER" ? { gridTemplateColumns: "1fr" } : undefined}
              >
                {role !== "FINANCE_OFFICER" && role !== "DRIVER" && <article className="panel utilization-panel">
                  <div className="panel-heading"><div><h2>Vehicle utilization</h2><p>Current operational status</p></div><strong>{utilizationPercent}%</strong></div>
                  <div className="live-status-list">
                    {vehicleStatusRows.map((key) => {
                      const count = vehicleStatuses[key] || 0
                      const percent = totalVehicles ? Math.round(count * 100 / totalVehicles) : 0
                      return <div className="live-status-row" key={key}><span>{label(key)}</span><div className="live-status-track"><i style={{ width: `${percent}%` }} /></div><b>{count}</b></div>
                    })}
                  </div>
                </article>}
                <article className="panel attention-panel" id="alerts">
                  <div className="panel-heading"><div><h2>Needs attention</h2><p>Current operational alerts</p></div></div>
                  <div className="attention-list">{notices.map((item) => <div className="attention-item" key={item.detail}>
                    <div className="attention-icon warning">⚠</div><div><strong>{item.title}</strong><span>{item.detail}</span></div>
                  </div>)}</div>
                  <button type="button" className="text-button" onClick={() => setShowNotice(true)}>View notifications <span>→</span></button>
                </article>
              </section>

              <section className="panel fleet-panel page-enter delay-three" id="fleet">
                <div className="panel-heading fleet-heading"><div><h2>Fleet overview</h2><p>Vehicles visible to your account</p></div></div>
                <div className="table-toolbar">
                  <div className="filter-tabs">{statusFilters.map(([name, value]) => <button type="button" className={status === value ? "selected" : ""} key={name} onClick={() => { setStatus(value); setPage(0) }}>{name}</button>)}</div>
                  <label className="search-box"><span>⌕</span><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(0) }} placeholder="Search registration, model, branch" /></label>
                </div>
                {vehiclePage.content?.length ? (
                  <>
                    <div className="table-scroll"><table><thead><tr><th>Vehicle</th><th>Branch</th><th>Assigned driver</th><th>Status</th><th>Current mileage</th><th>Insurance</th></tr></thead><tbody>
                      {vehiclePage.content.map((vehicle) => <tr key={vehicle.id}>
                        <td><div className="vehicle-cell"><div className="vehicle-avatar">▣</div><div><strong>{vehicle.registrationNumber}</strong><span>{[vehicle.manufacturer, vehicle.model].filter(Boolean).join(" ") || vehicle.vehicleType}</span></div></div></td>
                        <td>{vehicle.branchName || "—"}</td><td>{vehicle.assignedDriverId ? `Driver #${vehicle.assignedDriverId}` : "Unassigned"}</td>
                        <td><span className={`pill ${vehicle.status?.toLowerCase().replace(/_/g, "-")}`}><i />{label(vehicle.status)}</span></td>
                        <td>{vehicle.currentMileage ?? "-"} km</td><td><span className={vehicle.documentStatus === "EXPIRED" ? "health due" : "health"}>{label(vehicle.documentStatus || "Unknown")}</span></td>
                      </tr>)}
                    </tbody></table></div>
                    <div className="table-footer"><span>Page {page + 1} of {Math.max(vehiclePage.totalPages, 1)} · {vehiclePage.totalElements} vehicles</span><div className="page-controls">
                      <button type="button" className="secondary-button" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button>
                      <button type="button" className="secondary-button" disabled={page + 1 >= vehiclePage.totalPages} onClick={() => setPage(page + 1)}>Next</button>
                    </div></div>
                  </>
                ) : (
                  <div className="empty-state" role="status">
                    <strong>No vehicles available</strong>
                    <span>{query || status ? "Try adjusting the filters to view more fleet records." : "There are no vehicles in the current branch view."}</span>
                  </div>
                )}
              </section>
            </>
          )}
          </>}
        </div>
      </main>
    </div>
  )
}

export default OperationsDashboard