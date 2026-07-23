function requireEnv(name) {
  const value = process.env[name];

  if (!value || !String(value).trim()) {
    throw new Error(`${name} is required`);
  }

  return String(value).trim();
}

const PORT = process.env.PORT || 3000;
const WAHA_URL = requireEnv("WAHA_BASE_URL");
const WAHA_API_KEY = requireEnv("WAHA_API_KEY");
const SESSION = requireEnv("WAHA_SESSION");
const USAR_POSTGRES = Boolean(process.env.DATABASE_URL);
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || "finalmessageassets";
const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const SESSION_SECRET = process.env.SESSION_SECRET;
const PLATFORM_CONFIRMATION_ENABLED =
  String(process.env.PLATFORM_CONFIRMATION_ENABLED || "true").toLowerCase() !== "false";

module.exports = {
  ADMIN_PASSWORD,
  ADMIN_USER,
  PORT,
  PLATFORM_CONFIRMATION_ENABLED,
  SESSION,
  SESSION_SECRET,
  SUPABASE_BUCKET,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
  USAR_POSTGRES,
  WAHA_API_KEY,
  WAHA_URL,
  requireEnv,
};
