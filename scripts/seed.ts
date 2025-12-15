import { ensureSeeded } from "../src/server/db";

const result = ensureSeeded({ initialSkins: 50, initialBalance: 1000 });
console.log("Seed OK:", result);


