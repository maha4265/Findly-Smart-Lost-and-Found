const locationMap = {
  Library: { x: 210, y: 150 },
  Cafeteria: { x: 470, y: 170 },
  "Main Gate": { x: 95, y: 420 },
  Auditorium: { x: 690, y: 135 },
  "Computer Lab": { x: 360, y: 340 },
  "Sports Complex": { x: 740, y: 390 },
  "Parking Area": { x: 545, y: 445 },
};

const weights = {
  image: 0.42,
  category: 0.2,
  location: 0.2,
  time: 0.18,
};

export function findMatches(reports, focusReport = null) {
  const sourceReports = focusReport ? [focusReport] : reports;
  const matches = [];

  sourceReports.forEach((source) => {
    reports
      .filter((target) => String(target._id) !== String(source._id) && target.type !== source.type)
      .forEach((target) => {
        const lostItem = source.type === "lost" ? source : target;
        const foundItem = source.type === "found" ? source : target;
        const breakdown = scoreBreakdown(lostItem, foundItem);
        if (breakdown.total >= 45) {
          matches.push({
            id: `${lostItem._id}-${foundItem._id}`,
            lostItem,
            foundItem,
            score: breakdown.total,
            breakdown,
          });
        }
      });
  });

  return dedupe(matches).sort((a, b) => b.score - a.score);
}

function scoreBreakdown(a, b) {
  const image = imageSimilarity(a.embedding, b.embedding);
  const category = a.category === b.category ? 1 : 0.25;
  const location = distanceScore(a.location, b.location);
  const time = timeScore(a.occurredAt, b.occurredAt);
  const total = image * weights.image + category * weights.category + location * weights.location + time * weights.time;

  return {
    total: Math.round(total * 100),
    image: Math.round(image * 100),
    category: Math.round(category * 100),
    location: Math.round(location * 100),
    time: Math.round(time * 100),
  };
}

function imageSimilarity(a = [], b = []) {
  if (isPerceptualHash(a) && isPerceptualHash(b)) {
    return hammingSimilarity(a, b);
  }

  return cosineSimilarity(a, b);
}

function isPerceptualHash(value = []) {
  return value.length === 64 && value.every((bit) => bit === 0 || bit === 1);
}

function hammingSimilarity(a, b) {
  let sameBits = 0;
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] === b[index]) sameBits += 1;
  }

  return sameBits / a.length;
}

function cosineSimilarity(a = [], b = []) {
  if (!a.length || !b.length || a.length !== b.length) return 0;
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

function distanceScore(a, b) {
  const first = locationMap[a];
  const second = locationMap[b];
  if (!first || !second) return 0;
  const distance = Math.hypot(first.x - second.x, first.y - second.y);
  return Math.max(0, 1 - distance / 760);
}

function timeScore(a, b) {
  const hours = Math.abs(new Date(a) - new Date(b)) / 36e5;
  return Math.max(0, 1 - hours / 168);
}

function dedupe(matches) {
  const map = new Map();
  matches.forEach((match) => {
    map.set(match.id, match);
  });
  return [...map.values()];
}
