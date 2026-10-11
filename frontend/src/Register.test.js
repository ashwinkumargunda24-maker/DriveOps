import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import api from "./api"
import Register from "./Register"

jest.mock("./api", () => ({
  __esModule: true,
  default: { post: jest.fn() },
  errMsg: (error, fallback) => error.response?.data?.message || fallback,
}))

test("registers with the Spring auth endpoint and accepts its JSON response", async () => {
  api.post.mockResolvedValue({ data: { id: 12, username: "new-driver", role: "DRIVER" } })

  render(
    <MemoryRouter>
      <Register />
    </MemoryRouter>,
  )

  fireEvent.change(screen.getByLabelText(/username/i), { target: { value: "new-driver" } })
  fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: "driver@example.com" } })
  fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: "+91 98765 43210" } })
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "secret123" } })
  fireEvent.click(screen.getByRole("button", { name: /sign up/i }))

  await waitFor(() => expect(api.post).toHaveBeenCalledWith("/auth/register", {
    username: "new-driver",
    email: "driver@example.com",
    phone: "+91 98765 43210",
    password: "secret123",
  }))
  expect(await screen.findByText(/account created/i)).toBeInTheDocument()
})
