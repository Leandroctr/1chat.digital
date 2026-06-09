const express = require("express");
const session = require("express-session");

function configurarMiddlewares({
  app,
  publicDir,
  SESSION_SECRET,
  logWarn,
}) {
  app.use(
    "/webhook",
    express.json({
      limit: "1mb",
      verify: (req, res, buf) => {
        if (buf.length > 1024 * 1024) {
          const erro = new Error("Webhook ignorado: payload grande demais");
          erro.status = 413;
          throw erro;
        }
      },
    })
  );

  app.use(express.json({ limit: "5mb" }));
  app.use(express.urlencoded({ extended: false }));

  if (!SESSION_SECRET) {
    logWarn(
      "ADMIN",
      "SESSION_SECRET nao configurado; usando segredo local temporario"
    );
  }

  if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }

  app.use(session({
    name: "1chat.admin.sid",
    secret: SESSION_SECRET || "1chat-dev-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 8 * 60 * 60 * 1000,
    },
  }));

  app.use((req, res, next) => {
    const allowedOrigin = process.env.CORS_ORIGIN || "*";
    res.header("Access-Control-Allow-Origin", allowedOrigin);
    res.header("Access-Control-Allow-Headers", "Content-Type");
    res.header("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");

    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }

    return next();
  });
  app.use((req, res, next) => {
    if (req.path === "/admin.html") {
      return res.redirect("/admin");
    }

    return next();
  });
  app.use(express.static(publicDir));

  app.use((err, req, res, next) => {
    if (err.status === 413 || err.type === "entity.too.large") {
      console.log(`WEBHOOK GRANDE IGNORADO | ${req.originalUrl}`);
      logWarn("WEBHOOK", "Webhook grande ignorado", { url: req.originalUrl });
      return res.sendStatus(200);
    }

    return next(err);
  });
}

module.exports = {
  configurarMiddlewares,
};
