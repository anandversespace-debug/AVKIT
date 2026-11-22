import { detectProjectContext } from "../core/project/detector.js";
import { formatInfo } from "../ui/reporter.js";

export interface InfoOptions {
  cwd?: string;
  json?: boolean;
}

export async function infoCommand(options: InfoOptions = {}): Promise<void> {
  const targetDir = options.cwd || process.cwd();
  const context = await detectProjectContext(targetDir);
  const output = formatInfo(context, { json: options.json });
  console.log(output);
}
