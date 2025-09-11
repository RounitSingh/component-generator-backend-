import express from "express";
import dotenv from "dotenv";
import morgan from "morgan";
import cors from "cors";
import chalk from "chalk";
import authRoutes from "./features/routes/auth-Routes.js";
import sessionRoutes from "./features/routes/session-Routes.js";
import conversationRoutes from "./features/routes/conversation-Routes.js";
import messageRoutes from "./features/routes/message-Routes.js";
import quotaRoutes from "./features/routes/quota-Routes.js";

dotenv.config();
const app = express();

app.use(express.json());
app.use(
    morgan((tokens, req, res) => {
        const method = tokens.method(req, res);
        const status = tokens.status(req, res);
        const url = tokens.url(req, res);
        const responseTime = tokens["response-time"](req, res);
        const contentLength = tokens.res(req, res, "content-length") || "0";

        const statusColor =
            status >= 500
                ? chalk.red.bold("❌ " + status)
                : status >= 400
                    ? chalk.yellow.bold("⚠️ " + status)
                    : status >= 300
                        ? chalk.cyan.bold("🔄 " + status)
                        : chalk.green.bold("✅ " + status);

        const methodIcon =
            method === "GET"
                ? chalk.blue.bold("📥 GET")
                : method === "POST"
                    ? chalk.green.bold("📤 POST")
                    : method === "PUT"
                        ? chalk.yellow.bold("✏️ PUT")
                        : method === "DELETE"
                            ? chalk.red.bold("🗑 DELETE")
                            : chalk.magenta.bold("🔄 " + method);

        return [
            chalk.gray("📡 API:"),
            methodIcon,
            chalk.white(url),
            statusColor,
            chalk.blue(`${responseTime} ms`),
            chalk.gray(`📦 ${contentLength} bytes`),
        ].join("  ");
    })
);
app.use(cors());

// Routes
app.use("/api", authRoutes);
app.use("/api", sessionRoutes);
app.use("/api", conversationRoutes);
app.use("/api", messageRoutes);
app.use("/api", quotaRoutes);

export default app; 