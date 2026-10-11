import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import api, { errMsg } from "./api"
import "./FleetWorkspace.css"

const modules = {
  organizations: { title: "Organizations", endpoint: "/organizations", roles: ["SUPER_ADMIN"], fields: ["name", "contactEmail", "contactPhone", "address", "active"], columns: [["name", "Organization"], ["contactEmail", "Email"], ["contactPhone", "Phone"], ["active", "Status"]] },
  branches: { title: "Branches", endpoint: "/branches", roles: ["SUPER_ADMIN", "FLEET_MANAGER", "BRANCH_MANAGER", "FINANCE_OFFICER"], fields: ["name", "location", "address", "contactNumber", "organizationId", "managerUserId", "active"], columns: [["name", "Branch"], ["location", "Location"], ["organizationName", "Organization"], ["status", "Status"]] },
  users: { title: "Users", endpoint: "/users", roles: ["SUPER_ADMIN", "FLEET_MANAGER", "BRANCH_MANAGER"], fields: ["username", "email", "fullName", "phone", "password", "role", "organizationId", "branchId", "active"], columns: [["fullName", "Name"], ["email", "Email"], ["role", "Role"], ["branchName", "Branch"], ["active", "Active"]] },
  vehicles: { title: "Vehicles", endpoint: "/vehicles", roles: ["SUPER_ADMIN", "FLEET_MANAGER", "BRANCH_MANAGER", "DRIVER", "FINANCE_OFFICER"], fields: ["registrationNumber", "vehicleType", "manufacturer", "model", "year", "fuelType", "capacity", "currentMileage", "branchId", "status", "active", "insuranceExpiry", "registrationExpiry", "pollutionExpiry"], columns: [["registrationNumber", "Registration"], ["vehicleType", "Type"], ["model", "Model"], ["branchName", "Branch"], ["status", "Status"], ["currentMileage", "Mileage"]] },
  drivers: { title: "Drivers", endpoint: "/drivers", roles: ["SUPER_ADMIN", "FLEET_MANAGER", "BRANCH_MANAGER", "DRIVER", "FINANCE_OFFICER"], fields: ["name", "phone", "email", "address", "licenseNumber", "licenseType", "licenseExpiry", "joiningDate", "branchId", "status", "active"], columns: [["name", "Driver"], ["phone", "Phone"], ["licenseNumber", "License"], ["branchName", "Branch"], ["status", "Status"]] },
  routes: { title: "Routes", endpoint: "/routes", roles: ["SUPER_ADMIN", "FLEET_MANAGER", "BRANCH_MANAGER", "FINANCE_OFFICER", "DRIVER"], fields: ["source", "destination", "distanceKm", "estimatedDurationMinutes", "description", "branchId"], columns: [["source", "Source"], ["destination", "Destination"], ["distanceKm", "Distance km"], ["estimatedDurationMinutes", "Duration min"], ["branchName", "Branch"]] },
  trips: { title: "Trips", endpoint: "/trips", roles: ["SUPER_ADMIN", "FLEET_MANAGER", "BRANCH_MANAGER", "FINANCE_OFFICER", "DRIVER"], fields: ["routeId", "startDate", "expectedEndDate", "purpose", "distanceKm", "notes"], columns: [["id", "Trip"], ["routeLabel", "Route"], ["vehicleReg", "Vehicle"], ["driverName", "Driver"], ["startDate", "Start"], ["status", "Status"]] },
  maintenance: { title: "Maintenance", endpoint: "/maintenance", roles: ["SUPER_ADMIN", "FLEET_MANAGER", "BRANCH_MANAGER", "FINANCE_OFFICER", "DRIVER"], fields: ["vehicleId", "serviceType", "serviceDate", "currentMileage", "serviceCost", "nextServiceDate", "nextServiceMileage", "description", "status"], columns: [["registrationNumber", "Vehicle"], ["serviceType", "Service"], ["serviceDate", "Date"], ["serviceCost", "Cost"], ["status", "Status"]] },
  fuel: { title: "Fuel", endpoint: "/fuel", roles: ["SUPER_ADMIN", "FLEET_MANAGER", "BRANCH_MANAGER", "DRIVER", "FINANCE_OFFICER"], fields: ["vehicleId", "driverId", "date", "odometer", "fuelType", "quantity", "pricePerLiter", "fuelStation"], columns: [["registrationNumber", "Vehicle"], ["driverName", "Driver"], ["date", "Date"], ["quantity", "Liters"], ["totalCost", "Total"], ["efficiencyKmPerLitre", "Km/L"]] },
  expenses: { title: "Expenses", endpoint: "/expenses", roles: ["SUPER_ADMIN", "DRIVER", "FINANCE_OFFICER"], fields: ["vehicleId", "tripId", "driverId", "category", "amount", "date", "description"], columns: [["id", "Expense"], ["category", "Category"], ["vehicleReg", "Vehicle"], ["amount", "Amount"], ["date", "Date"], ["status", "Status"]] },
  incidents: { title: "Incidents", endpoint: "/incidents", roles: ["SUPER_ADMIN", "FLEET_MANAGER", "BRANCH_MANAGER", "DRIVER", "FINANCE_OFFICER"], fields: ["vehicleId", "driverId", "tripId", "incidentType", "occurredAt", "location", "severity", "description", "status", "assignedInvestigator", "investigationNotes", "resolutionNotes"], columns: [["id", "Incident"], ["vehicleReg", "Vehicle"], ["driverName", "Driver"], ["severity", "Severity"], ["occurredAt", "Occurred"], ["status", "Status"]] },
  documents: { title: "Documents", endpoint: "/documents", roles: ["SUPER_ADMIN", "FLEET_MANAGER", "BRANCH_MANAGER", "FINANCE_OFFICER", "DRIVER"], fields: ["ownerType", "ownerId", "kind", "expiryDate", "file"], columns: [["ownerType", "Owner type"], ["ownerId", "Owner"], ["kind", "Document"], ["expiryDate", "Expires"], ["status", "Status"], ["fileName", "File"]] },
  audits: { title: "Audit Logs", endpoint: "/audits", roles: ["SUPER_ADMIN", "FLEET_MANAGER", "BRANCH_MANAGER", "FINANCE_OFFICER"], fields: [], columns: [["actor", "Actor"], ["role", "Role"], ["action", "Action"], ["entityType", "Entity"], ["entityId", "Record"], ["createdAt", "Time"]] },
}

const choices = {
  role: ["SUPER_ADMIN", "FLEET_MANAGER", "BRANCH_MANAGER", "DRIVER", "FINANCE_OFFICER"],
  status: ["AVAILABLE", "ASSIGNED", "ON_TRIP", "MAINTENANCE", "INACTIVE", "ON_LEAVE", "PLANNED", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "OVERDUE", "PENDING", "APPROVED", "REJECTED", "REPORTED", "UNDER_INVESTIGATION", "RESOLVED", "CLOSED"],
  vehicleType: ["CAR", "VAN", "TRUCK", "BUS", "OTHER"],
  fuelType: ["PETROL", "DIESEL", "ELECTRIC", "CNG", "HYBRID", "OTHER"],
  serviceType: ["REGULAR_SERVICE", "OIL_CHANGE", "TIRE_REPLACEMENT", "BRAKE_SERVICE", "ENGINE_SERVICE", "GENERAL_REPAIR", "INSPECTION"],
  category: ["FUEL", "MAINTENANCE", "TOLL", "PARKING", "DRIVER_ALLOWANCE", "REPAIR", "INSURANCE", "OTHER"],
  severity: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
  incidentType: ["ACCIDENT", "VEHICLE_BREAKDOWN", "ROAD_HAZARD", "CARGO_ISSUE", "OTHER"],
  ownerType: ["VEHICLE", "DRIVER"],
  kind: ["REGISTRATION", "INSURANCE", "POLLUTION_CERTIFICATE", "FITNESS_CERTIFICATE", "DRIVING_LICENSE", "ID_PROOF", "OTHER"],
}

const editRoles = ["SUPER_ADMIN", "FLEET_MANAGER", "BRANCH_MANAGER"]
const createRoles = {
  organizations: ["SUPER_ADMIN"],
  branches: ["SUPER_ADMIN"],
  users: ["SUPER_ADMIN"],
  vehicles: editRoles,
  drivers: editRoles,
  routes: editRoles,
  trips: editRoles,
  maintenance: editRoles,
  fuel: [...editRoles, "DRIVER"],
  expenses: ["SUPER_ADMIN", "DRIVER", "FINANCE_OFFICER"],
  incidents: [...editRoles, "DRIVER"],
  documents: [...editRoles, "DRIVER"],
}

const updateRoles = {
  organizations: ["SUPER_ADMIN"],
  branches: ["SUPER_ADMIN", "FLEET_MANAGER", "BRANCH_MANAGER"],
  users: ["SUPER_ADMIN"],
  vehicles: editRoles,
  drivers: editRoles,
  routes: editRoles,
  trips: editRoles,
  maintenance: editRoles,
  incidents: editRoles,
}

const numberFields = ["branchId", "organizationId", "managerUserId", "vehicleId", "driverId", "routeId", "tripId", "year", "capacity", "currentMileage", "distanceKm", "estimatedDurationMinutes", "amount", "quantity", "pricePerLiter", "odometer", "serviceCost", "nextServiceMileage", "ownerId"]
const activeModules = ["organizations", "branches", "users", "vehicles", "drivers"]
const reviewRoles = ["SUPER_ADMIN", "FINANCE_OFFICER"]
const label = (key) => key.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase())
const role = localStorage.getItem("role")

function FleetWorkspace() {
  const requestedModule = new URLSearchParams(window.location.search).get("module")
  const defaultModule = Object.keys(modules).find((key) => modules[key].roles.includes(role)) || "vehicles"
  const [active, setActive] = useState(modules[requestedModule]?.roles.includes(role) ? requestedModule : defaultModule)
  const [data, setData] = useState([])
  const [branches, setBranches] = useState([])
  const [organizations, setOrganizations] = useState([])
  const [users, setUsers] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [drivers, setDrivers] = useState([])
  const [routes, setRoutes] = useState([])
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [editing, setEditing] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [values, setValues] = useState({})
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const config = modules[active]
  const visibleFields = active === "branches" && role !== "SUPER_ADMIN"
    ? config.fields.filter((field) => !["organizationId", "managerUserId"].includes(field))
    : config.fields
  const allowedModules = useMemo(() => Object.entries(modules).filter(([, item]) => item.roles.includes(role)), [])

  useEffect(() => {
    Promise.all([
      api.get("/branches", { params: { page: 0, size: 500 } }).catch(() => null),
      api.get("/organizations", { params: { page: 0, size: 500 } }).catch(() => null),
      api.get("/users", { params: { page: 0, size: 500 } }).catch(() => null),
      api.get("/vehicles", { params: { page: 0, size: 500 } }).catch(() => null),
      api.get("/drivers", { params: { page: 0, size: 500 } }).catch(() => null),
      api.get("/routes", { params: { page: 0, size: 500 } }).catch(() => null),
    ]).then((responses) => {
      setBranches(responses[0]?.data.content || [])
      setOrganizations(responses[1]?.data.content || [])
      setUsers(responses[2]?.data.content || [])
      setVehicles(responses[3]?.data.content || [])
      setDrivers(responses[4]?.data.content || [])
      setRoutes(responses[5]?.data.content || [])
    })
  }, [])

  useEffect(() => {
    let mounted = true
    const params = { q: query || undefined, page, size: 10 }
    if (active === "incidents") params.severity = statusFilter || undefined
    else params.status = statusFilter || undefined
    api.get(config.endpoint, { params }).then(({ data: result }) => {
      if (!mounted) return
      setData(result.content || [])
      setTotalPages(result.totalPages || 0)
      setTotalElements(result.totalElements || 0)
      setError("")
    }).catch((requestError) => {
      if (mounted) setError(errMsg(requestError, `Unable to load ${config.title.toLowerCase()}.`))
    })
    return () => { mounted = false }
  }, [active, config, page, query, statusFilter])

  const optionsFor = (field) => {
    if (field === "branchId") return branches.map((item) => [item.id, item.name])
    if (field === "organizationId") return organizations.map((item) => [item.id, item.name])
    if (field === "managerUserId") return users.filter((item) => item.role === "BRANCH_MANAGER").map((item) => [item.id, item.fullName || item.username])
    if (field === "vehicleId") return vehicles.map((item) => [item.id, item.registrationNumber])
    if (field === "driverId") return drivers.map((item) => [item.id, item.name])
    if (field === "routeId") return routes.map((item) => [item.id, `${item.source} to ${item.destination}`])
    return (choices[field] || []).map((value) => [value, value])
  }

  const save = async (event) => {
    event.preventDefault()
    if (submitting) return
    setError("")
    setMessage("")
    setSubmitting(true)
    try {
      let payload = { ...values }
      numberFields.forEach((field) => {
        if (payload[field] !== "" && payload[field] != null) payload[field] = Number(payload[field])
        else delete payload[field]
      })
      if (active === "vehicles") {
        payload.status = payload.status || "AVAILABLE"
        payload.active = payload.active !== false
      }

      if (active === "documents") {
        const formData = new FormData()
        Object.entries(payload).forEach(([key, value]) => {
          if (value !== "" && value != null) formData.append(key, value)
        })
        await api.post(config.endpoint, formData)
      } else if (active === "incidents" && editing) {
        await api.put(`${config.endpoint}/${editing.id}`, payload)
      } else {
        const id = editing?.id
        if (id) await api.put(`${config.endpoint}/${id}`, payload)
        else await api.post(config.endpoint, payload)
      }

      setMessage(editing ? "Record updated." : "Record created.")
      setEditing(null)
      setValues({})
      setFormOpen(false)
      const response = await api.get(config.endpoint, { params: { q: query || undefined, status: statusFilter || undefined, page, size: 10 } })
      setData(response.data.content || [])
      setTotalPages(response.data.totalPages || 0)
      setTotalElements(response.data.totalElements || 0)
    } catch (requestError) {
      setError(errMsg(requestError, "Unable to save this record."))
    } finally {
      setSubmitting(false)
    }
  }

  const action = async (url, body, success) => {
    try {
      await api.post(url, body)
      setMessage(success)
      const response = await api.get(config.endpoint, { params: { q: query || undefined, status: statusFilter || undefined, page, size: 10 } })
      setData(response.data.content || [])
    } catch (requestError) {
      setError(errMsg(requestError, "Action could not be completed."))
    }
  }

  const deactivate = async (row) => {
    const payload = { ...row, active: false }
    if (active === "vehicles" || active === "drivers") payload.status = "INACTIVE"
    try {
      await api.put(`${config.endpoint}/${row.id}`, payload)
      setMessage(`${config.title.replace(/s$/, "")} deactivated.`)
      const response = await api.get(config.endpoint, { params: { q: query || undefined, status: statusFilter || undefined, page, size: 10 } })
      setData(response.data.content || [])
    } catch (requestError) {
      setError(errMsg(requestError, "Unable to deactivate this record."))
    }
  }

  const exportCsv = async () => {
    try {
      if (!["vehicles", "trips", "expenses", "maintenance"].includes(active)) {
        setError("CSV export is available for vehicles, trips, expenses, and maintenance.")
        return
      }
      const { data: csv } = await api.get(`/export/${active}`, { responseType: "blob" })
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }))
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = `${active}.csv`
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (requestError) {
      setError(errMsg(requestError, "Export failed."))
    }
  }

  const createNew = () => { setEditing(null); setValues({}); setFormOpen(true) }
  const edit = (row) => {
    setEditing(row)
    setFormOpen(true)
    setValues(Object.fromEntries(visibleFields.filter((field) => field !== "password" && field !== "file").map((field) => [field, row[field] ?? ""])))
  }

  return <main className="workspace-page">
    <header className="workspace-header"><div><Link to="/dashboard" className="workspace-back">← Dashboard</Link><h1>Fleet workspace</h1><p>Manage the records and operations available to your role.</p></div><span className="workspace-role">{role?.replace(/_/g, " ")}</span></header>
    <div className="workspace-layout">
      <nav className="workspace-nav" aria-label="Fleet modules">{allowedModules.map(([key, item]) => <button key={key} type="button" className={active === key ? "selected" : ""} onClick={() => { setActive(key); setEditing(null); setFormOpen(false); setValues({}); setPage(0); setQuery(""); setStatusFilter(""); setMessage(""); setError("") }}>{item.title}</button>)}</nav>
      <section className="workspace-content">
        <div className="workspace-toolbar"><div><h2>{config.title}</h2><span>{totalElements} records</span></div><div className="workspace-actions"><label className="search-box"><span>⌕</span><input value={query} placeholder={`Search ${config.title.toLowerCase()}`} onChange={(event) => { setQuery(event.target.value); setPage(0) }} /></label>{["vehicles", "trips", "expenses", "maintenance"].includes(active) && <button type="button" className="secondary-button" onClick={exportCsv}>Export CSV</button>}{createRoles[active]?.includes(role) && <button type="button" className="primary-button" onClick={createNew}>＋ {active === "documents" ? "Upload document" : `Add ${config.title.replace(/s$/, "").toLowerCase()}`}</button>}</div></div>
        {["vehicles", "drivers", "trips", "maintenance", "expenses", "incidents"].includes(active) && <label className="workspace-filter">{active === "incidents" ? "Severity" : "Status"} <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(0) }}><option value="">{active === "incidents" ? "All severities" : "All statuses"}</option>{(active === "vehicles" ? ["AVAILABLE", "ASSIGNED", "ON_TRIP", "MAINTENANCE", "INACTIVE"] : active === "drivers" ? ["AVAILABLE", "ASSIGNED", "ON_TRIP", "ON_LEAVE", "INACTIVE"] : active === "trips" ? ["PLANNED", "ASSIGNED", "STARTED", "DELAYED", "COMPLETED", "CANCELLED"] : active === "maintenance" ? ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "OVERDUE"] : active === "expenses" ? ["PENDING", "APPROVED", "REJECTED"] : ["LOW", "MEDIUM", "HIGH", "CRITICAL"]).map((item) => <option key={item} value={item}>{item}</option>)}</select></label>}
        {error && <div className="form-error" role="alert">{error}</div>}{message && <div className="workspace-success" role="status">{message}</div>}
        {formOpen && <form className="workspace-form" onSubmit={save}><h3>{active === "documents" ? "Upload document" : `${editing ? "Edit" : "New"} ${config.title.replace(/s$/, "").toLowerCase()}`}</h3><div className="workspace-fields">{visibleFields.map((field) => <label key={field}>{label(field)}{field === "active" ? <input type="checkbox" checked={values.active ?? true} onChange={(event) => setValues({ ...values, active: event.target.checked })} /> : field === "file" ? <input type="file" onChange={(event) => setValues({ ...values, file: event.target.files[0] })} /> : optionsFor(field).length ? <select required={!['managerUserId', 'driverId'].includes(field)} value={values[field] ?? ""} onChange={(event) => setValues({ ...values, [field]: event.target.value })}><option value="">Select {label(field).toLowerCase()}</option>{optionsFor(field).map(([value, name]) => <option value={value} key={value}>{name}</option>)}</select> : <input required={['name', 'registrationNumber', 'source', 'destination', 'username', 'email', 'password', 'licenseNumber', 'startDate', 'expectedEndDate', 'occurredAt', 'description', 'amount', 'quantity', 'pricePerLiter', 'incidentType'].includes(field) && !(editing && field === 'password')} type={field === 'startDate' || field === 'expectedEndDate' || field === 'occurredAt' ? 'datetime-local' : field.toLowerCase().includes('date') ? 'date' : ['amount', 'quantity', 'pricePerLiter', 'distanceKm', 'capacity', 'currentMileage', 'year', 'estimatedDurationMinutes', 'ownerId', 'odometer'].includes(field) ? 'number' : 'text'} step={field === 'amount' || field === 'quantity' || field === 'pricePerLiter' || field === 'distanceKm' ? 'any' : undefined} value={values[field] ?? ''} onChange={(event) => setValues({ ...values, [field]: event.target.value })} />}</label>)}</div><div className="workspace-form-buttons"><button className="primary-button" type="submit" disabled={submitting}>{submitting ? 'Saving...' : active === 'documents' ? 'Upload' : 'Save'}</button><button className="secondary-button" type="button" onClick={() => { setFormOpen(false); setEditing(null); setValues({}) }}>Cancel</button></div></form>}
        {active === "trips" && editRoles.includes(role) && <AssignmentPanel vehicles={vehicles} drivers={drivers} rows={data} onAssign={(id, vehicleId, driverId) => action(`/trips/${id}/assign`, { vehicleId: Number(vehicleId), driverId: Number(driverId) }, "Trip assigned.")} onStatus={(id, status) => action(`/trips/${id}/status`, { status, remarks: "Updated from operations workspace" }, `Trip status changed to ${status}.`)} />}
        <div className="workspace-table-wrap"><table><thead><tr>{config.columns.map(([field, title]) => <th key={field}>{title}</th>)}<th>Actions</th></tr></thead><tbody>{data.map((row) => <tr key={row.id}>{config.columns.map(([field]) => <td key={field}>{row[field] ?? "—"}</td>)}<td className="table-actions">{updateRoles[active]?.includes(role) && <button type="button" className="table-action" onClick={() => edit(row)}>Edit</button>}{activeModules.includes(active) && row.active !== false && updateRoles[active]?.includes(role) && <button type="button" className="table-action danger" onClick={() => deactivate(row)}>Deactivate</button>}{active === "expenses" && reviewRoles.includes(role) && row.status === "PENDING" && <><button type="button" className="table-action approve" onClick={() => action(`/expenses/${row.id}/review`, { approve: true }, "Expense approved.")}>Approve</button><button type="button" className="table-action reject" onClick={() => action(`/expenses/${row.id}/review`, { approve: false }, "Expense rejected.")}>Reject</button></>}{active === "trips" && reviewRoles.includes(role) && row.status === "COMPLETED" && <button type="button" className="table-action" onClick={() => { const amount = window.prompt("Revenue amount (INR)"); if (amount) action(`/trips/${row.id}/revenue`, { revenueAmount: Number(amount) }, "Trip revenue recorded.") }}>Record revenue</button>}</td></tr>)}</tbody></table></div>
        {totalPages > 0 && <div className="workspace-footer"><span>Page {page + 1} of {Math.max(totalPages, 1)}</span><div className="page-controls"><button type="button" className="secondary-button" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button><button type="button" className="secondary-button" disabled={page + 1 >= totalPages} onClick={() => setPage(page + 1)}>Next</button></div></div>}
      </section>
    </div>
  </main>
}

function AssignmentPanel({ vehicles, drivers, rows, onAssign, onStatus }) {
  const [selected, setSelected] = useState({})
  return <section className="assignment-list"><h3>Trip assignment and lifecycle</h3>{rows.filter((trip) => !["COMPLETED", "CANCELLED"].includes(trip.status)).map((trip) => <div className="assignment-row" key={trip.id}><div><strong>Trip #{trip.id}</strong><span>{trip.routeLabel} · {trip.startDate || "Date not set"} · {trip.status}</span></div>{trip.status === "PLANNED" && <div className="assignment-controls"><select aria-label={`Vehicle for trip ${trip.id}`} value={selected[trip.id]?.vehicleId || ""} onChange={(event) => setSelected({ ...selected, [trip.id]: { ...selected[trip.id], vehicleId: event.target.value } })}><option value="">Vehicle</option>{vehicles.map((vehicle) => <option value={vehicle.id} key={vehicle.id}>{vehicle.registrationNumber}</option>)}</select><select aria-label={`Driver for trip ${trip.id}`} value={selected[trip.id]?.driverId || ""} onChange={(event) => setSelected({ ...selected, [trip.id]: { ...selected[trip.id], driverId: event.target.value } })}><option value="">Driver</option>{drivers.map((driver) => <option value={driver.id} key={driver.id}>{driver.name}</option>)}</select><button type="button" className="table-action" disabled={!selected[trip.id]?.vehicleId || !selected[trip.id]?.driverId} onClick={() => onAssign(trip.id, selected[trip.id].vehicleId, selected[trip.id].driverId)}>Assign</button></div>}{trip.status === "ASSIGNED" && <button type="button" className="table-action" onClick={() => onStatus(trip.id, "STARTED")}>Start trip</button>}{trip.status === "STARTED" && <button type="button" className="table-action" onClick={() => onStatus(trip.id, "DELAYED")}>Mark delayed</button>}{["STARTED", "DELAYED"].includes(trip.status) && <button type="button" className="table-action approve" onClick={() => onStatus(trip.id, "COMPLETED")}>Complete</button>}</div>)}{rows.filter((trip) => !["COMPLETED", "CANCELLED"].includes(trip.status)).length === 0 && <p>No active trips.</p>}</section>
}

export default FleetWorkspace
