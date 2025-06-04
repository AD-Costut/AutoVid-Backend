const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const open = require("open").default;

const { swaggerUi, swaggerSpec } = require("./swagger");
const authRouter = require("./controllers/LoginController");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
console.log("Swagger loaded endpoints:", swaggerSpec.paths);

app.use("/auth", authRouter);

app.get("/", (req, res) => {
  res.send("AutoVid backend is running!");
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected!"))
  .catch((err) => console.error("MongoDB error:", err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
  open(`http://localhost:${PORT}/api-docs`);
});
