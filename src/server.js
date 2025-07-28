import dotenv from "dotenv";
import chalk from "chalk";
import figlet from "figlet";
import app from "./app.js";

dotenv.config();
const PORT = process.env.PORT ;

app.listen(PORT, () => {
    try {
        const banner = figlet.textSync("Server Running !", { horizontalLayout: "default" });
        console.log(chalk.blue.bold(banner));
        console.log(chalk.yellow.bold(`🚀 Server is live at http://localhost:${PORT}`));
    } catch (error) {
        console.error(chalk.red.bold("❌ Error displaying banner"), error);
    }
}); 