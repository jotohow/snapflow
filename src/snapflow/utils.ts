const fs = require('fs');

/**
 * Read JSONL file and parse each line as JSON
 */
async function readJsonl(filePath: string): Promise<any[]> {
  try {
    const text = await fs.promises.readFile(filePath, 'utf-8');
    const lines = text.split('\n').filter((line: string) => line.trim() !== '');
    const parsed = lines.map((line: string) => JSON.parse(line));
    return parsed;
  } catch (error) {
    console.error('❌ Error in readJsonl:', error);
    throw error;
  }
}

/**
 * Read the last N entries from a JSONL file
 */
export default async function readLastNJsonl(
  filePath: string,
  n: number
): Promise<any[]> {
  try {
    const entries = await readJsonl(filePath);
    const result = entries.reverse().slice(0, n);
    return result;
  } catch (error) {
    console.error('❌ Error in readLastNJsonl:', error);
    throw error;
  }
}
