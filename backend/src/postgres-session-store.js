const session = require("express-session");
const { db } = require("./supabase");

class PostgresSessionStore extends session.Store {
  constructor(options = {}) {
    super(options);
    this.options = options;
  }

  async get(sid, callback) {
    try {
      const result = await db.query(
        "SELECT sess FROM sessions WHERE sid = $1 AND expire > NOW()",
        [sid]
      );
      if (result.rows.length === 0) {
        return callback(null, null);
      }
      callback(null, result.rows[0].sess);
    } catch (error) {
      callback(error);
    }
  }

  async set(sid, sess, callback) {
    try {
      const expireTime = new Date(
        sess.cookie.expires || Date.now() + 24 * 60 * 60 * 1000
      );
      await db.query(
        `INSERT INTO sessions (sid, sess, expire)
         VALUES ($1, $2, $3)
         ON CONFLICT (sid) DO UPDATE
         SET sess = EXCLUDED.sess, expire = EXCLUDED.expire`,
        [sid, JSON.stringify(sess), expireTime]
      );
      callback(null);
    } catch (error) {
      callback(error);
    }
  }

  async destroy(sid, callback) {
    try {
      await db.query("DELETE FROM sessions WHERE sid = $1", [sid]);
      callback(null);
    } catch (error) {
      callback(error);
    }
  }

  async clear(callback) {
    try {
      await db.query("DELETE FROM sessions WHERE expire <= NOW()");
      callback(null);
    } catch (error) {
      callback(error);
    }
  }

  async length(callback) {
    try {
      const result = await db.query(
        "SELECT COUNT(*) as count FROM sessions WHERE expire > NOW()"
      );
      callback(null, result.rows[0].count);
    } catch (error) {
      callback(error);
    }
  }
}

module.exports = PostgresSessionStore;
