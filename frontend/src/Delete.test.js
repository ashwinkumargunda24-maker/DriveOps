import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import Delete from "./Delete"

test("explains that self-service deletion is unavailable instead of calling an unsupported endpoint", () => {
  render(<MemoryRouter><Delete /></MemoryRouter>)

  expect(screen.getByText(/self-service account deletion is not currently supported/i)).toBeInTheDocument()
  expect(screen.getByRole("link", { name: /back to account/i })).toHaveAttribute("href", "/dboard")
})
