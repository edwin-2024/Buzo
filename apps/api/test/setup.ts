// Preload mock test environment variables for local & CI test execution
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    "postgresql://mock:mock@localhost:5432/buzo_test?sslmode=disable";
}
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "super-secret-jwt-key-minimum-32-chars-long";
}
if (!process.env.CLIENT_URL) {
  process.env.CLIENT_URL = "http://localhost:5173";
}
