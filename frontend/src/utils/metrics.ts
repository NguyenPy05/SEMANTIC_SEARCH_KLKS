import type { EvalInputRow, MetricSummary, QueryMetric } from "../types";

const normalize = (value: string): string => value.trim().toLowerCase();
const stripAccents = (value: string): string =>
  value
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const normalizeHeader = (value: string): string =>
  stripAccents(normalize(value)).replace(/[^a-z0-9]/g, "");

const toNumber = (value: unknown): number | undefined => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const inferRank = (row: EvalInputRow): number | undefined => {
  const rank = toNumber(row.rank);
  if (rank && rank > 0) {
    return rank;
  }

  if (
    row.retrieved_doc &&
    normalize(row.retrieved_doc) === normalize(row.expected_doc)
  ) {
    return 1;
  }

  return undefined;
};

export const calculateMetrics = (
  rows: EvalInputRow[],
  k: number,
): MetricSummary => {
  const safeK = Math.max(1, k);

  const metrics: QueryMetric[] = rows.map((row) => {
    const rank = inferRank(row);
    const hitAt1 = rank === 1 ? 1 : 0;
    const hitAtK = rank && rank <= safeK ? 1 : 0;
    const retrievedDocDisplay =
      row.retrieved_doc && row.retrieved_doc.trim()
        ? row.retrieved_doc
        : rank
          ? `Top-${rank}`
          : "-";

    return {
      query: row.query,
      expectedDoc: row.expected_doc,
      retrievedDoc: retrievedDocDisplay,
      hitAt1,
      hitAtK,
      precisionAtK: hitAtK / safeK,
      recallAtK: hitAtK,
      reciprocalRank: rank ? 1 / rank : 0,
    };
  });

  const total = metrics.length || 1;
  const avgHitAt1 = metrics.reduce((sum, row) => sum + row.hitAt1, 0) / total;
  const avgPrecisionAtK =
    metrics.reduce((sum, row) => sum + row.precisionAtK, 0) / total;
  const avgRecallAtK =
    metrics.reduce((sum, row) => sum + row.recallAtK, 0) / total;
  const avgHitAtK = metrics.reduce((sum, row) => sum + row.hitAtK, 0) / total;
  const mrr = metrics.reduce((sum, row) => sum + row.reciprocalRank, 0) / total;

  return {
    avgHitAt1,
    avgAccuracyAt1: avgHitAt1,
    avgPrecisionAtK,
    avgRecallAtK,
    avgHitAtK,
    mrr,
    rows: metrics,
  };
};

export const parseEvaluationCsv = (text: string): EvalInputRow[] => {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return [];
  }

  const delimiter = detectDelimiter(lines[0]);
  const headers = splitCsvLine(lines[0], delimiter).map((item) =>
    normalizeHeader(item),
  );

  const queryKeys = ["query", "question", "cauhoitest", "cauhoi", "querytext"];
  const expectedKeys = [
    "expecteddoc",
    "expecteddocument",
    "sachkyvong",
    "tailieuky vọng",
    "tailieukyvong",
  ];
  const retrievedKeys = [
    "retrieveddoc",
    "retrieveddocument",
    "sachtimduoc",
    "tailieutimduoc",
  ];
  const rankKeys = [
    "rank",
    "retrievedrank",
    "xephangtimduoc",
    "xephangtimuoc",
    "xephang",
  ];

  const queryIndex = pickHeaderIndex(headers, queryKeys);
  const expectedIndex = pickHeaderIndex(headers, expectedKeys);
  const retrievedIndex = pickHeaderIndex(headers, retrievedKeys);
  const rankIndex = pickHeaderIndex(headers, rankKeys);

  if (
    queryIndex < 0 ||
    expectedIndex < 0 ||
    (retrievedIndex < 0 && rankIndex < 0)
  ) {
    return [];
  }

  return lines
    .slice(1)
    .map((line) => {
      const values = splitCsvLine(line, delimiter);
      const getValue = (idx: number): string => {
        return idx >= 0 ? (values[idx] ?? "") : "";
      };

      return {
        query: getValue(queryIndex),
        expected_doc: getValue(expectedIndex),
        retrieved_doc: getValue(retrievedIndex),
        rank: parseRankValue(getValue(rankIndex)),
      };
    })
    .filter((row) => row.query && row.expected_doc);
};

const splitCsvLine = (line: string, delimiter: string): string[] => {
  const parts: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      parts.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  parts.push(current.trim());
  return parts;
};

const detectDelimiter = (headerLine: string): string => {
  const commaCount = (headerLine.match(/,/g) ?? []).length;
  const semicolonCount = (headerLine.match(/;/g) ?? []).length;
  const tabCount = (headerLine.match(/\t/g) ?? []).length;

  if (semicolonCount > commaCount && semicolonCount >= tabCount) {
    return ";";
  }

  if (tabCount > commaCount && tabCount > semicolonCount) {
    return "\t";
  }

  return ",";
};

const pickHeaderIndex = (headers: string[], aliases: string[]): number => {
  for (const alias of aliases) {
    const idx = headers.indexOf(alias);
    if (idx >= 0) {
      return idx;
    }
  }
  return -1;
};

const parseRankValue = (value: string): number | undefined => {
  const normalizedValue = normalize(value);
  if (
    !normalizedValue ||
    normalizedValue === "n/a" ||
    normalizedValue === "na"
  ) {
    return undefined;
  }
  return toNumber(normalizedValue);
};
