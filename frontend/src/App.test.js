import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the DriveOps home page', () => {
  render(<App />);
  expect(screen.getByRole('link', { name: /login/i })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /sign up/i })).toBeInTheDocument();
});
