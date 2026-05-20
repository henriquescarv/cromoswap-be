require('dotenv').config();

// Railway (and other PaaS) provide a DATABASE_URL connection string.
// Parse it into individual fields so the rest of the config stays uniform.
const dbUrl = process.env.DATABASE_URL
  ? new URL(process.env.DATABASE_URL)
  : null;

module.exports = {

  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '30d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '60d'
  },

  database: {
    name: dbUrl ? dbUrl.pathname.slice(1) : process.env.DB_NAME,
    user: dbUrl ? dbUrl.username : process.env.DB_USER,
    password: dbUrl ? dbUrl.password : process.env.DB_PASSWORD,
    host: dbUrl ? dbUrl.hostname : process.env.DB_HOST,
    port: dbUrl ? Number(dbUrl.port) : (process.env.DB_PORT || 5432),
    dialect: process.env.DB_DIALECT || 'postgres',
    dialectOptions: dbUrl ? { ssl: { require: true, rejectUnauthorized: false } } : {}
  },

  email: {
    resendApiKey: process.env.RESEND_API_KEY,
    fromAddress: process.env.EMAIL_FROM || 'noreply@cromoswap.com'
  },

  cors: {
    origin: process.env.CORS_ORIGIN || '*'
  },

  aws: {
    region: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    bucketName: process.env.AWS_S3_BUCKET_NAME,
  }
};
