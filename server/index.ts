import { createApp } from "./app.ts";
import { config } from "./config.ts";

const app = createApp();

app.listen(config.port, "127.0.0.1", () => {
  console.log(`UrgeWise API listening on http://127.0.0.1:${config.port}`);
});
