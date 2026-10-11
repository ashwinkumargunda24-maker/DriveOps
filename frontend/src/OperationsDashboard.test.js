import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import api from "./api"
import OperationsDashboard from "./OperationsDashboard"

jest.mock("./api", () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn() },
  errMsg: (error, fallback) => error.response?.data?.message || fallback,
}))

const localDateTime = (date) => {
  const pad = (value) => String(value).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

const tripStartingIn = (minutes, days = 0) => {
  const startDate = new Date(Date.now())
  startDate.setDate(startDate.getDate() + days)
  startDate.setMinutes(startDate.getMinutes() + minutes)
  return {
    id: 42,
    status: "ASSIGNED",
    startDate: localDateTime(startDate),
    routeSource: "Hyderabad",
    routeDestination: "Bengaluru",
  }
}

const renderDriverDashboard = async (trip, finance = { fuel: [], expenses: [] }) => {
  localStorage.setItem("role", "DRIVER")
  api.get.mockImplementation((endpoint) => {
    if (endpoint === "/dashboard") {
      return Promise.resolve({ data: { role: "DRIVER", user: { fullName: "Ravi Kumar" }, myTrips: [trip] } })
    }
    if (endpoint === "/notifications") return Promise.resolve({ data: [] })
    if (endpoint === "/fuel") return Promise.resolve({ data: { content: finance.fuel } })
    if (endpoint === "/expenses") return Promise.resolve({ data: { content: finance.expenses } })
    return Promise.resolve({ data: { content: [], totalPages: 0, totalElements: 0 } })
  })

  render(<MemoryRouter><OperationsDashboard /></MemoryRouter>)
  await screen.findByRole("heading", { name: /ravi/i })
}

beforeEach(() => {
  jest.useFakeTimers()
  jest.setSystemTime(new Date(2026, 9, 11, 10, 0, 0))
  localStorage.clear()
  jest.clearAllMocks()
})

afterEach(() => {
  jest.useRealTimers()
})

test("does not present a future-day assignment as today's trip", async () => {
  await renderDriverDashboard(tripStartingIn(0, 1))

  expect(screen.getByText("No trip assigned today")).toBeInTheDocument()
  expect(screen.queryByRole("button", { name: /start trip/i })).not.toBeInTheDocument()
})

test("keeps today's start action disabled until the scheduled time", async () => {
  await renderDriverDashboard(tripStartingIn(5))

  expect(screen.getByText(/Hyderabad.*Bengaluru/)).toBeInTheDocument()
  expect(screen.getByRole("button", { name: /start trip/i })).toBeDisabled()

  act(() => jest.advanceTimersByTime(5 * 60_000))
  await waitFor(() => expect(screen.getByRole("button", { name: /start trip/i })).toBeEnabled())
})

test("starts an assigned trip once its scheduled time has arrived", async () => {
  await renderDriverDashboard(tripStartingIn(-1))

  fireEvent.click(screen.getByRole("button", { name: /start trip/i }))

  await waitFor(() => expect(api.post).toHaveBeenCalledWith("/trips/42/status", { status: "STARTED" }))
})

test("opens the driver navigation drawer and closes it after selecting a section", async () => {
  await renderDriverDashboard(tripStartingIn(0))

  const sidebar = document.querySelector(".sidebar")
  const menuButton = screen.getByRole("button", { name: "Open navigation" })
  fireEvent.click(menuButton)

  expect(sidebar).toHaveClass("mobile-open")
  expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument()
  expect(screen.getByRole("button", { name: "Close navigation" })).toHaveAttribute("aria-expanded", "true")

  fireEvent.click(screen.getByRole("button", { name: /Trip History/ }))
  expect(sidebar).not.toHaveClass("mobile-open")
})

test("keeps a mobile way back from management to the dashboard", async () => {
  localStorage.setItem("role", "FLEET_MANAGER")
  api.get.mockImplementation((endpoint) => {
    if (endpoint === "/dashboard") {
      return Promise.resolve({ data: { role: "FLEET_MANAGER", user: { fullName: "Fleet Manager" } } })
    }
    if (endpoint === "/notifications") return Promise.resolve({ data: [] })
    if (endpoint === "/vehicles") return Promise.resolve({ data: { content: [], totalPages: 0, totalElements: 0 } })
    return Promise.resolve({ data: { content: [], totalPages: 0, totalElements: 0 } })
  })
  render(<MemoryRouter><OperationsDashboard /></MemoryRouter>)

  fireEvent.click(await screen.findByRole("button", { name: /Management/ }))
  fireEvent.click(screen.getByRole("button", { name: "Open navigation" }))

  expect(document.querySelector(".sidebar")).toHaveClass("mobile-open")
  fireEvent.click(screen.getByRole("button", { name: /Back to dashboard/ }))
  expect(await screen.findByRole("button", { name: "Open navigation" })).toBeInTheDocument()
})

test("shows each fuel purchase once while retaining other driver expenses", async () => {
  await renderDriverDashboard(tripStartingIn(0), {
    fuel: [{ id: 7, totalCost: 7880, date: "2026-10-10" }],
    expenses: [
      { id: 19, amount: 7880, category: "FUEL", status: "PENDING", date: "2026-10-10" },
      { id: 20, amount: 350, category: "TOLL", status: "PENDING", date: "2026-10-10" },
    ],
  })
  fireEvent.click(screen.getByRole("button", { name: /Fuel & Expenses/ }))

  expect(await screen.findByText("Recent")).toBeInTheDocument()
  expect(screen.getAllByText("₹7,880")).toHaveLength(1)
  expect(screen.getByText("Fuel")).toBeInTheDocument()
  expect(screen.getByText("Toll")).toBeInTheDocument()
})
