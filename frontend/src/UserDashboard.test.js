import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import api from "./api"
import UserDashboard from "./UserDashboard"

jest.mock("./api", () => ({
  __esModule: true,
  default: { get: jest.fn() },
  errMsg: (error, fallback) => error.response?.data?.message || fallback,
}))

test("loads only the authenticated account details without exposing credentials", async () => {
  api.get.mockResolvedValue({
    data: {
      username: "driver-1",
      email: "driver@example.com",
      fullName: "Ravi Kumar",
      phone: "+91 98765 43210",
      role: "DRIVER",
      branchName: "Hyderabad Hub",
      token: "server-token",
    },
  })

  render(<MemoryRouter><UserDashboard /></MemoryRouter>)

  expect(await screen.findByText("Ravi Kumar")).toBeInTheDocument()
  expect(screen.getByText("driver@example.com")).toBeInTheDocument()
  expect(screen.getByText("+91 98765 43210")).toBeInTheDocument()
  expect(screen.getByText("Hyderabad Hub")).toBeInTheDocument()
  expect(api.get).toHaveBeenCalledWith("/auth/me")
  expect(screen.queryByText("server-token")).not.toBeInTheDocument()
  expect(screen.queryByText(/password:/i)).not.toBeInTheDocument()
})
