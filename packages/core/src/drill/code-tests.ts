/**
 * Parse and run simple JS drill tests in-browser (no external sandbox).
 * Card back format:
 *   TEST: expression returning boolean
 *   HINT: optional hint line
 */
export interface CodeTest {
  expr: string;
}

export interface CodeTestResult {
  expr: string;
  pass: boolean;
  error?: string;
}

export function parseCodeTests(back: string): { tests: CodeTest[]; hint?: string } {
  const tests: CodeTest[] = [];
  let hint: string | undefined;
  for (const line of back.split("\n")) {
    const t = line.match(/^TEST:\s*(.+)$/i);
    if (t) {
      tests.push({ expr: t[1].trim() });
      continue;
    }
    const h = line.match(/^HINT:\s*(.+)$/i);
    if (h) hint = h[1].trim();
  }
  return { tests, hint };
}

/** Run user code + tests. User code should define `solution` function. */
export function runCodeTests(userCode: string, tests: CodeTest[]): CodeTestResult[] {
  if (!tests.length) return [];
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function(`${userCode}\nreturn typeof solution === "function" ? solution : null;`);
    const solution = fn();
    if (typeof solution !== "function") {
      return tests.map((t) => ({
        expr: t.expr,
        pass: false,
        error: "Define a function named `solution`",
      }));
    }
    return tests.map((t) => {
      try {
        // eslint-disable-next-line no-new-func
        const check = new Function("solution", `return Boolean(${t.expr})`);
        return { expr: t.expr, pass: !!check(solution) };
      } catch (e) {
        return { expr: t.expr, pass: false, error: e instanceof Error ? e.message : "Test error" };
      }
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Syntax error";
    return tests.map((t) => ({ expr: t.expr, pass: false, error: msg }));
  }
}
