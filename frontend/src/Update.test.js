import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import api from "./api"
import Update from "./Update"

jest.mock("./api", () => ({
  __esModule: true,
  default: { post: jest.fn() },
  errMsg: (error, fallback) => error.response?.data?.message || fallback,
}))

test("uses the authenticated password endpoint and validates confirmation", async () => {
  api.post.mockResolvedValue({ data: { message: "Password changed successfully." } })
  render(<MemoryRouter><Update /></MemoryRouter>)

  fireEvent.change(screen.getByLabelText(/current password/i), { target: { value: "current-secret" } })
  fireEvent.change(screen.getByLabelText(/^new password$/i), { target: { value: "new-secret-123" } })
  fireEvent.change(screen.getByLabelText(/confirm new password/i), { target: { value: "different-secret" } })
  fireEvent.click(screen.getByRole("button", { name: /update password/i }))

  expect(await screen.findByRole("alert")).toHaveTextContent(/do not match/i)
  expect(api.post).not.toHaveBeenCalled()

  fireEvent.change(screen.getByLabelText(/confirm new password/i), { target: { value: "new-secret-123" } })
  fireEvent.click(screen.getByRole("button", { name: /update password/i }))

  await waitFor(() => expect(api.post).toHaveBeenCalledWith("/auth/change-password", {
    currentPassword: "current-secret",
    newPassword: "new-secret-123",
  }))
  expect(await screen.findByRole("status")).toHaveTextContent(/password changed successfully/i)
})
