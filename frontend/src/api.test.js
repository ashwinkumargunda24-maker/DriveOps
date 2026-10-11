const loadApiWithBaseUrl = (baseUrl) => {
  const previousBaseUrl = process.env.REACT_APP_API_BASE_URL
  if (baseUrl === undefined) {
    delete process.env.REACT_APP_API_BASE_URL
  } else {
    process.env.REACT_APP_API_BASE_URL = baseUrl
  }

  let api
  try {
    jest.isolateModules(() => {
      api = require("./api").default
    })
  } finally {
    if (previousBaseUrl === undefined) {
      delete process.env.REACT_APP_API_BASE_URL
    } else {
      process.env.REACT_APP_API_BASE_URL = previousBaseUrl
    }
  }
  return api
}

test("uses the configured API base URL and removes trailing slashes", () => {
  const api = loadApiWithBaseUrl("https://api.example.com/api///")

  expect(api.defaults.baseURL).toBe("https://api.example.com/api")
})

test("retains the local backend URL when no API base URL is configured", () => {
  const api = loadApiWithBaseUrl(undefined)

  expect(api.defaults.baseURL).toBe("http://localhost:8081/api")
})
