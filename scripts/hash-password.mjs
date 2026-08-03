import { createHash } from "node:crypto";
import { createInterface } from "node:readline";
import process from "node:process";

async function readPassword() {
  if (!process.stdin.isTTY) {
    let input = "";
    for await (const chunk of process.stdin) input += chunk;
    return input.replace(/[\r\n]+$/, "");
  }

  const prompt = createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true
  });

  const originalWriter = prompt._writeToOutput.bind(prompt);
  let hideInput = false;
  prompt._writeToOutput = (value) => {
    originalWriter(hideInput && !/[\r\n]/.test(value) ? "•" : value);
  };

  const passwordPromise = new Promise((resolve) => {
    prompt.question("Neues Vorschau-Passwort: ", (answer) => resolve(answer));
  });
  hideInput = true;
  const password = await passwordPromise;
  hideInput = false;
  process.stdout.write("\n");
  prompt.close();
  return password;
}

const password = await readPassword();

if (password.length < 16) {
  console.error("Das Vorschau-Passwort muss mindestens 16 Zeichen lang sein.");
  process.exit(1);
}

console.log(createHash("sha256").update(password).digest("hex"));
