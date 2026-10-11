import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import api from "./api"
import Login from "./Login"

jest.mock("./api", () => ({
  __esModule: true,
  default: { post: jest.fn() },
  errMsg: (error, fallback) => error.response?.data?.message || fallback,
}))

test("signs in through the JWT endpoint and stores the role session", async () => {
  const user = {
    username: "manager",
    token: "signed-token",
    role: "BRANCH_MANAGER",
    branchId: 4,
  }
  api.post.mockResolvedValue({ data: user })

  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>,
  )

  fireEvent.change(screen.getByLabelText(/username/i), {
    target: { value: "manager" },
  })
  fireEvent.change(screen.getByLabelText(/password/i), {
    target: { value: "secret123" },
  })
  fireEvent.click(screen.getByRole("button", { name: /login/i }))

  await waitFor(() => expect(api.post).toHaveBeenCalledWith("/auth/login", {
    identifier: "manager",
    password: "secret123",
  }))
  await waitFor(() => expect(localStorage.getItem("token")).toBe("signed-token"))
  expect(localStorage.getItem("role")).toBe("BRANCH_MANAGER")
  expect(JSON.parse(localStorage.getItem("user"))).toEqual(user)
})