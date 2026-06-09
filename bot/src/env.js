const PORT = process.env.PORT || 3000;
const WAHA_URL = process.env.WAHA_URL || process.env.WAHA_BASE_URL || "http://localhost:3001";
const WAHA_API_KEY = process.env.WAHA_API_KEY || "123456";
const SESSION = process.env.WAHA_SESSION || "default";
const USAR_POSTGRES = Boolean(process.env.DATABASE_URL);
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || "finalmessageassets";
const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const SESSION_SECRET = process.env.SESSION_SECRET;

module.exports = {
  ADMIN_PASSWORD,
  ADMIN_USER,
  PORT,
  SESSION,
  SESSION_SECRET,
  SUPABASE_BUCKET,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
  USAR_POSTGRES,
  WAHA_API_KEY,
  WAHA_URL,
};
